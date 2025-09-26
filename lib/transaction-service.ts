/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */
// lib/transaction-service.ts
import { Query } from "appwrite";
import { databases, config } from "./appwrite";

export type TransactionType = "CASH_IN" | "CASH_OUT" | "SEND" | "RECEIVE";
export type TransactionStatus = "PENDING" | "COMPLETED" | "FAILED";

export interface Transaction {
  id: string;
  type: TransactionType;
  amount: number;
  description: string;
  paymentId?: string;
  timestamp: number;
  reference?: string;
  userId: string;
  balance?: number;
  recipientId?: string;
  status?: TransactionStatus;
}

// Get the collection ID for transactions
const getTransactionsCollectionId = () => {
  return (
    process.env.NEXT_PUBLIC_APPWRITE_TRANSACTIONS_COLLECTION_ID ||
    "67d318fd000f44a3c9ea"
  );
};

// ---- internal: fetch all with pagination (cursor, then offset fallback) ----
async function listAllDocuments(
  databaseId: string,
  collectionId: string,
  baseQueries: string[] = [],
  batchSize = 100,
  maxPages = 1000
) {
  try {
    const all: any[] = [];
    let cursor: string | null = null;

    for (let page = 0; page < maxPages; page++) {
      const queries = [...baseQueries, Query.limit(batchSize)];
      if (cursor) queries.push(Query.cursorAfter(cursor));

      const res = await databases.listDocuments(
        databaseId,
        collectionId,
        queries
      );
      if (res.documents.length === 0) break;

      all.push(...res.documents);
      if (res.documents.length < batchSize) break;

      cursor = res.documents[res.documents.length - 1].$id;
    }

    return all;
  } catch {
    const all: any[] = [];
    for (let page = 0; page < maxPages; page++) {
      const offset = page * batchSize;
      const res = await databases.listDocuments(databaseId, collectionId, [
        ...baseQueries,
        Query.limit(batchSize),
        Query.offset(offset),
      ]);
      if (res.documents.length === 0) break;
      all.push(...res.documents);
      if (res.documents.length < batchSize) break;
    }
    return all;
  }
}

const mapTransaction = (doc: any): Transaction => ({
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
});

// Get all transactions (unlimited, controlled batching)
export async function getAllTransactions(): Promise<Transaction[]> {
  try {
    const databaseId = config.databaseId!;
    const collectionId = getTransactionsCollectionId();
    if (!databaseId || !collectionId)
      throw new Error("Appwrite configuration missing");

    const docs = await listAllDocuments(databaseId, collectionId);
    const txs = docs.map(mapTransaction);
    txs.sort((a, b) => b.timestamp - a.timestamp);
    return txs;
  } catch (error) {
    console.error("Error getting all transactions:", error);
    return [];
  }
}

// Get transactions by status (unlimited, controlled batching)
export async function getTransactionsByStatus(
  status: TransactionStatus
): Promise<Transaction[]> {
  try {
    const databaseId = config.databaseId!;
    const collectionId = getTransactionsCollectionId();
    if (!databaseId || !collectionId)
      throw new Error("Appwrite configuration missing");

    const docs = await listAllDocuments(databaseId, collectionId, [
      Query.equal("status", status),
    ]);
    const txs = docs.map(mapTransaction);
    txs.sort((a, b) => b.timestamp - a.timestamp);
    return txs;
  } catch (error) {
    console.error(`Error getting transactions by status ${status}:`, error);
    return [];
  }
}

// Get transaction by ID (single)
export async function getTransactionById(
  transactionId: string
): Promise<Transaction | null> {
  try {
    const databaseId = config.databaseId!;
    const collectionId = getTransactionsCollectionId();
    if (!databaseId || !collectionId)
      throw new Error("Appwrite configuration missing");

    const response = await databases.listDocuments(databaseId, collectionId, [
      Query.equal("transactionId", transactionId),
      Query.limit(1),
    ]);

    if (response.documents.length === 0) return null;
    return mapTransaction(response.documents[0]);
  } catch (error) {
    console.error(`Error getting transaction by ID ${transactionId}:`, error);
    return null;
  }
}

// Update transaction status (unchanged logic; balance recalc now uses unlimited fetch)
export async function updateTransactionStatus(
  transactionId: string,
  status: TransactionStatus,
  notes?: string
): Promise<boolean> {
  try {
    const databaseId = config.databaseId!;
    const collectionId = getTransactionsCollectionId();
    if (!databaseId || !collectionId)
      throw new Error("Appwrite configuration missing");

    const response = await databases.listDocuments(databaseId, collectionId, [
      Query.equal("transactionId", transactionId),
      Query.limit(1),
    ]);

    if (response.documents.length === 0)
      throw new Error(`Transaction with ID ${transactionId} not found`);

    const transactionDoc = response.documents[0];
    const oldStatus = transactionDoc.status || "PENDING";
    if (oldStatus === status) return true;

    await databases.updateDocument(
      databaseId,
      collectionId,
      transactionDoc.$id,
      {
        status,
        statusNotes: notes || "",
        statusUpdatedAt: Date.now().toString(),
      }
    );

    if (status === "COMPLETED") {
      await recalculateAllBalances(transactionDoc.userId);
      try {
        await createTransactionNotification(mapTransaction(transactionDoc));
      } catch (notificationError) {
        console.error(
          "Error creating transaction notification:",
          notificationError
        );
      }
    }

    return true;
  } catch (error) {
    console.error("Error updating transaction status:", error);
    return false;
  }
}

// Recalculate all balances for a user (unlimited, controlled batching)
async function recalculateAllBalances(userId: string): Promise<void> {
  try {
    const databaseId = config.databaseId!;
    const collectionId = getTransactionsCollectionId();
    if (!databaseId || !collectionId)
      throw new Error("Appwrite configuration missing");

    const docs = await listAllDocuments(databaseId, collectionId, [
      Query.equal("userId", userId),
      Query.equal("status", "COMPLETED"),
    ]);

    const ordered = docs
      .map((d) => d)
      .sort((a, b) => Number(a.timestamp) - Number(b.timestamp));

    let runningBalance = 0;

    for (const doc of ordered) {
      const amount = Number.parseFloat(doc.amount);
      const type = doc.type;

      if (type === "CASH_IN" || type === "RECEIVE") runningBalance += amount;
      else if (type === "CASH_OUT" || type === "SEND") runningBalance -= amount;

      await databases.updateDocument(databaseId, collectionId, doc.$id, {
        balance: runningBalance.toString(),
      });
    }
  } catch (error) {
    console.error("Error recalculating balances:", error);
    throw error;
  }
}

// Create transaction notification (placeholder)
async function createTransactionNotification(
  _transaction: Transaction
): Promise<void> {
  try {
    // Implement your notifications collection here if needed
    // console.log("Transaction notification:", _transaction)
  } catch (error) {
    console.error("Error creating transaction notification:", error);
  }
}
