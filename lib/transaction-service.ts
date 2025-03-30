import { Query } from "appwrite"
import { databases, config } from "./appwrite"

export type TransactionType = "CASH_IN" | "CASH_OUT" | "SEND" | "RECEIVE"
export type TransactionStatus = "PENDING" | "COMPLETED" | "FAILED"

export interface Transaction {
  id: string
  type: TransactionType
  amount: number
  description: string
  paymentId?: string
  timestamp: number
  reference?: string
  userId: string
  balance?: number
  recipientId?: string
  status?: TransactionStatus
}

// Get the collection ID for transactions
const getTransactionsCollectionId = () => {
  return process.env.NEXT_PUBLIC_APPWRITE_TRANSACTIONS_COLLECTION_ID || "67d318fd000f44a3c9ea"
}

// Get all transactions
export async function getAllTransactions(): Promise<Transaction[]> {
  try {
    const databaseId = config.databaseId
    const collectionId = getTransactionsCollectionId()

    if (!databaseId || !collectionId) {
      throw new Error("Appwrite configuration missing")
    }

    const response = await databases.listDocuments(databaseId, collectionId, [Query.orderDesc("timestamp")])

    return response.documents.map((doc) => ({
      id: doc.transactionId,
      type: doc.type,
      amount: Number.parseFloat(doc.amount),
      description: doc.description,
      paymentId: doc.paymentId,
      timestamp: Number.parseInt(doc.timestamp, 10),
      reference: doc.reference,
      userId: doc.userId,
      balance: doc.balance ? Number.parseFloat(doc.balance) : undefined,
      recipientId: doc.recipientId || undefined,
      status: doc.status || "PENDING",
    }))
  } catch (error) {
    console.error("Error getting all transactions:", error)
    return []
  }
}

// Get transactions by status
export async function getTransactionsByStatus(status: TransactionStatus): Promise<Transaction[]> {
  try {
    const databaseId = config.databaseId
    const collectionId = getTransactionsCollectionId()

    if (!databaseId || !collectionId) {
      throw new Error("Appwrite configuration missing")
    }

    const response = await databases.listDocuments(databaseId, collectionId, [
      Query.equal("status", status),
      Query.orderDesc("timestamp"),
    ])

    return response.documents.map((doc) => ({
      id: doc.transactionId,
      type: doc.type,
      amount: Number.parseFloat(doc.amount),
      description: doc.description,
      paymentId: doc.paymentId,
      timestamp: Number.parseInt(doc.timestamp, 10),
      reference: doc.reference,
      userId: doc.userId,
      balance: doc.balance ? Number.parseFloat(doc.balance) : undefined,
      recipientId: doc.recipientId || undefined,
      status: doc.status || "PENDING",
    }))
  } catch (error) {
    console.error(`Error getting transactions by status ${status}:`, error)
    return []
  }
}

// Get transaction by ID
export async function getTransactionById(transactionId: string): Promise<Transaction | null> {
  try {
    const databaseId = config.databaseId
    const collectionId = getTransactionsCollectionId()

    if (!databaseId || !collectionId) {
      throw new Error("Appwrite configuration missing")
    }

    const response = await databases.listDocuments(databaseId, collectionId, [
      Query.equal("transactionId", transactionId),
      Query.limit(1),
    ])

    if (response.documents.length === 0) {
      return null
    }

    const doc = response.documents[0]
    return {
      id: doc.transactionId,
      type: doc.type,
      amount: Number.parseFloat(doc.amount),
      description: doc.description,
      paymentId: doc.paymentId,
      timestamp: Number.parseInt(doc.timestamp, 10),
      reference: doc.reference,
      userId: doc.userId,
      balance: doc.balance ? Number.parseFloat(doc.balance) : undefined,
      recipientId: doc.recipientId || undefined,
      status: doc.status || "PENDING",
    }
  } catch (error) {
    console.error(`Error getting transaction by ID ${transactionId}:`, error)
    return null
  }
}

// Update transaction status
export async function updateTransactionStatus(
  transactionId: string,
  status: TransactionStatus,
  notes?: string,
): Promise<boolean> {
  try {
    const databaseId = config.databaseId
    const collectionId = getTransactionsCollectionId()

    if (!databaseId || !collectionId) {
      throw new Error("Appwrite configuration missing")
    }

    // Find the transaction document by transactionId
    const response = await databases.listDocuments(databaseId, collectionId, [
      Query.equal("transactionId", transactionId),
      Query.limit(1),
    ])

    if (response.documents.length === 0) {
      throw new Error(`Transaction with ID ${transactionId} not found`)
    }

    const transactionDoc = response.documents[0]
    const oldStatus = transactionDoc.status || "PENDING"

    // If status is already set to the requested status, no need to update
    if (oldStatus === status) {
      return true
    }

    // Update the transaction status
    await databases.updateDocument(databaseId, collectionId, transactionDoc.$id, {
      status: status,
      statusNotes: notes || "",
      statusUpdatedAt: Date.now().toString(),
    })

    // If the transaction is completed and it's a CASH_IN or RECEIVE transaction,
    // we need to update the balance
    if (status === "COMPLETED") {
      const transaction: Transaction = {
        id: transactionId,
        type: transactionDoc.type,
        amount: Number.parseFloat(transactionDoc.amount),
        description: transactionDoc.description,
        paymentId: transactionDoc.paymentId,
        timestamp: Number.parseInt(transactionDoc.timestamp, 10),
        reference: transactionDoc.reference,
        userId: transactionDoc.userId,
        status: "COMPLETED",
      }

      // Recalculate the balance for this user
      await recalculateAllBalances(transaction.userId)

      // Create notification for completed transaction
      try {
        await createTransactionNotification(transaction)
      } catch (notificationError) {
        console.error("Error creating transaction notification:", notificationError)
        // Continue even if notification creation fails
      }
    }

    return true
  } catch (error) {
    console.error("Error updating transaction status:", error)
    return false
  }
}

// Recalculate all balances for a user
async function recalculateAllBalances(userId: string): Promise<void> {
  try {
    const databaseId = config.databaseId
    const collectionId = getTransactionsCollectionId()

    if (!databaseId || !collectionId) {
      throw new Error("Appwrite configuration missing")
    }

    // Only consider COMPLETED transactions for recalculation
    const response = await databases.listDocuments(databaseId, collectionId, [
      Query.equal("userId", userId),
      Query.equal("status", "COMPLETED"),
      Query.orderAsc("timestamp"),
    ])

    let runningBalance = 0

    for (const doc of response.documents) {
      const amount = Number.parseFloat(doc.amount)
      const type = doc.type

      if (type === "CASH_IN" || type === "RECEIVE") {
        runningBalance += amount
      } else if (type === "CASH_OUT" || type === "SEND") {
        runningBalance -= amount
      }

      await databases.updateDocument(databaseId, collectionId, doc.$id, {
        balance: runningBalance.toString(),
      })
    }
  } catch (error) {
    console.error("Error recalculating balances:", error)
    throw error
  }
}

// Create transaction notification
async function createTransactionNotification(transaction: Transaction, specificUserId?: string): Promise<void> {
  try {
    // This is a simplified version for the admin dashboard
    // In a real implementation, you would create a notification in your notifications collection
    console.log("Transaction notification would be created here:", transaction)
  } catch (error) {
    console.error("Error creating transaction notification:", error)
  }
}

