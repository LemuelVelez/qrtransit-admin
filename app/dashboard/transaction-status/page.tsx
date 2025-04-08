/* eslint-disable @typescript-eslint/no-explicit-any */
"use client"

import { useState, useEffect, useCallback } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Search, Loader2, CheckCircle, XCircle, Clock, AlertCircle } from "lucide-react"
import { formatCurrency, formatDate } from "@/lib/utils"
import {
  getAllTransactions,
  getTransactionsByStatus,
  updateTransactionStatus,
  type Transaction,
  type TransactionStatus,
} from "@/lib/transaction-service"
import { Skeleton } from "@/components/ui/skeleton"

export default function TransactionStatusPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [filteredTransactions, setFilteredTransactions] = useState<Transaction[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [isLoading, setIsLoading] = useState(true)
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null)
  const [isUpdating, setIsUpdating] = useState(false)
  const [newStatus, setNewStatus] = useState<TransactionStatus>("COMPLETED")
  const [notes, setNotes] = useState("")
  const [activeTab, setActiveTab] = useState("pending")
  const [updateSuccess, setUpdateSuccess] = useState(false)
  const [updateError, setUpdateError] = useState<string | null>(null)
  const [initialLoadComplete, setInitialLoadComplete] = useState(false)

  const fetchTransactions = useCallback(async () => {
    setIsLoading(true)
    try {
      let fetchedTransactions: Transaction[] = []

      if (activeTab === "all") {
        fetchedTransactions = await getAllTransactions()
      } else if (activeTab === "pending") {
        fetchedTransactions = await getTransactionsByStatus("PENDING")
      } else if (activeTab === "completed") {
        fetchedTransactions = await getTransactionsByStatus("COMPLETED")
      } else if (activeTab === "failed") {
        fetchedTransactions = await getTransactionsByStatus("FAILED")
      }

      console.log(`Fetched ${fetchedTransactions.length} transactions for tab: ${activeTab}`)

      setTransactions(fetchedTransactions)
      setFilteredTransactions(fetchedTransactions)
      setInitialLoadComplete(true)
    } catch (error) {
      console.error("Error fetching transactions:", error)
    } finally {
      setIsLoading(false)
    }
  }, [activeTab])

  useEffect(() => {
    fetchTransactions()
  }, [activeTab, fetchTransactions])

  const filterTransactions = useCallback(() => {
    if (searchQuery.trim() === "") {
      setFilteredTransactions(transactions)
    } else {
      const query = searchQuery.toLowerCase()
      const filtered = transactions.filter(
        (t) =>
          t.id.toLowerCase().includes(query) ||
          t.userId.toLowerCase().includes(query) ||
          t.description.toLowerCase().includes(query) ||
          t.type.toLowerCase().includes(query),
      )
      setFilteredTransactions(filtered)
    }
  }, [searchQuery, transactions])

  useEffect(() => {
    filterTransactions()
  }, [filterTransactions])

  const handleUpdateStatus = async () => {
    if (!selectedTransaction) return

    setIsUpdating(true)
    setUpdateSuccess(false)
    setUpdateError(null)

    try {
      const success = await updateTransactionStatus(selectedTransaction.id, newStatus, notes)

      if (success) {
        setUpdateSuccess(true)
        // Update local state
        setTransactions(transactions.map((t) => (t.id === selectedTransaction.id ? { ...t, status: newStatus } : t)))
        setFilteredTransactions(
          filteredTransactions.map((t) => (t.id === selectedTransaction.id ? { ...t, status: newStatus } : t)),
        )

        // Close dialog after 1.5 seconds
        setTimeout(() => {
          setSelectedTransaction(null)
          setNotes("")
          fetchTransactions() // Refresh data
        }, 1500)
      } else {
        setUpdateError("Failed to update transaction status. Please try again.")
      }
    } catch (error: any) {
      setUpdateError(error.message || "An error occurred while updating the transaction status.")
    } finally {
      setIsUpdating(false)
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "COMPLETED":
        return (
          <Badge className="bg-emerald-500 hover:bg-emerald-600 text-white">
            <CheckCircle className="mr-1 h-3 w-3" />
            Completed
          </Badge>
        )
      case "PENDING":
        return (
          <Badge variant="accent" className="text-white">
            <Clock className="mr-1 h-3 w-3" />
            Pending
          </Badge>
        )
      case "FAILED":
        return (
          <Badge variant="destructive">
            <XCircle className="mr-1 h-3 w-3" />
            Failed
          </Badge>
        )
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  const getTransactionTypeLabel = (type: string) => {
    switch (type) {
      case "CASH_IN":
        return "Cash In"
      case "CASH_OUT":
        return "Cash Out"
      case "SEND":
        return "Send Money"
      case "RECEIVE":
        return "Receive Money"
      default:
        return type
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Transaction Status Management</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Manage Transaction Status</CardTitle>
          <CardDescription>View and update the status of transactions</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="pending" value={activeTab} onValueChange={setActiveTab} className="space-y-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <TabsList className="max-w-xs bg-primary text-white">
                <TabsTrigger value="pending">Pending</TabsTrigger>
                <TabsTrigger value="completed">Completed</TabsTrigger>
                <TabsTrigger value="failed">Failed</TabsTrigger>
                <TabsTrigger value="all">All</TabsTrigger>
              </TabsList>

              <div className="relative w-full sm:w-auto">
                <Search className="absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search transactions..."
                  className="pl-8 w-full sm:w-[300px]"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>

            <TabsContent value="pending" className="space-y-4">
              {renderTransactionsTable()}
            </TabsContent>

            <TabsContent value="completed" className="space-y-4">
              {renderTransactionsTable()}
            </TabsContent>

            <TabsContent value="failed" className="space-y-4">
              {renderTransactionsTable()}
            </TabsContent>

            <TabsContent value="all" className="space-y-4">
              {renderTransactionsTable()}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      <Dialog open={!!selectedTransaction} onOpenChange={(open) => !open && setSelectedTransaction(null)}>
        <DialogContent className="sm:max-w-[500px] bg-primary text-white">
          <DialogHeader>
            <DialogTitle>Update Transaction Status</DialogTitle>
            <DialogDescription>Change the status of transaction {selectedTransaction?.id}</DialogDescription>
          </DialogHeader>

          {updateSuccess && (
            <Alert className="bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-200 dark:border-emerald-900">
              <CheckCircle className="h-4 w-4" />
              <AlertDescription>Transaction status updated successfully!</AlertDescription>
            </Alert>
          )}

          {updateError && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{updateError}</AlertDescription>
            </Alert>
          )}

          <div className="space-y-4 py-4">
            {selectedTransaction && (
              <div className="grid gap-4 py-2">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <Label className="text-muted-foreground">Transaction ID</Label>
                    <p className="font-mono text-sm break-all">{selectedTransaction.id}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Amount</Label>
                    <p className="font-medium">{formatCurrency(selectedTransaction.amount)}</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <Label className="text-muted-foreground">Type</Label>
                    <p>{getTransactionTypeLabel(selectedTransaction.type)}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Current Status</Label>
                    <div className="mt-1">{getStatusBadge(selectedTransaction.status || "PENDING")}</div>
                  </div>
                </div>

                <div>
                  <Label className="text-muted-foreground">Description</Label>
                  <p className="text-sm">{selectedTransaction.description}</p>
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="status">New Status</Label>
              <Select value={newStatus} onValueChange={(value: TransactionStatus) => setNewStatus(value)}>
                <SelectTrigger id="status">
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent className="text-white bg-secondary">
                  <SelectItem value="PENDING">Pending</SelectItem>
                  <SelectItem value="COMPLETED">Completed</SelectItem>
                  <SelectItem value="FAILED">Failed</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Notes (Optional)</Label>
              <Textarea
                id="notes"
                placeholder="Add notes about this status change"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>
          </div>

          <DialogFooter className="flex flex-col sm:flex-row gap-2">
            <Button
              variant="outline"
              onClick={() => setSelectedTransaction(null)}
              disabled={isUpdating}
              className="w-full sm:w-auto"
            >
              Cancel
            </Button>
            <Button variant="secondary" onClick={handleUpdateStatus} disabled={isUpdating || updateSuccess} className="w-full sm:w-auto">
              {isUpdating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Updating...
                </>
              ) : (
                "Update Status"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )

  function renderTransactionsTable() {
    if (isLoading) {
      return (
        <div className="rounded-md border overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Transaction ID</TableHead>
                <TableHead className="hidden md:table-cell">User ID</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead className="hidden md:table-cell">Description</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {Array(5)
                .fill(0)
                .map((_, i) => (
                  <TableRow key={i}>
                    <TableCell>
                      <Skeleton className="h-4 w-24 bg-primary/20" />
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      <Skeleton className="h-4 w-24 bg-primary/20" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-4 w-16 bg-primary/20" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-4 w-16 bg-primary/20" />
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      <Skeleton className="h-4 w-32 bg-primary/20" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-4 w-24 bg-primary/20" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-6 w-20 bg-primary/20" />
                    </TableCell>
                    <TableCell className="text-right">
                      <Skeleton className="h-8 w-16 ml-auto bg-primary/20" />
                    </TableCell>
                  </TableRow>
                ))}
            </TableBody>
          </Table>
        </div>
      )
    }

    // Show a message if no transactions are found after initial load
    if (initialLoadComplete && filteredTransactions.length === 0) {
      return (
        <div className="rounded-md border p-8 text-center">
          <div className="flex flex-col items-center justify-center gap-2">
            <XCircle className="h-8 w-8 text-muted-foreground" />
            <h3 className="text-lg font-medium">No transactions found</h3>
            <p className="text-sm text-muted-foreground">
              {searchQuery
                ? "Try adjusting your search query"
                : activeTab === "pending"
                  ? "There are no pending transactions at the moment"
                  : `There are no ${activeTab} transactions to display`}
            </p>
          </div>
        </div>
      )
    }

    return (
      <div className="rounded-md border overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Transaction ID</TableHead>
              <TableHead className="hidden md:table-cell">User ID</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Amount</TableHead>
              <TableHead className="hidden md:table-cell">Description</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredTransactions.map((transaction) => (
              <TableRow key={transaction.id}>
                <TableCell className="font-mono text-xs max-w-[100px] truncate">{transaction.id}</TableCell>
                <TableCell className="hidden md:table-cell max-w-[100px] truncate">{transaction.userId}</TableCell>
                <TableCell>{getTransactionTypeLabel(transaction.type)}</TableCell>
                <TableCell>{formatCurrency(transaction.amount)}</TableCell>
                <TableCell className="max-w-[200px] truncate hidden md:table-cell">{transaction.description}</TableCell>
                <TableCell className="whitespace-nowrap">{formatDate(transaction.timestamp)}</TableCell>
                <TableCell>{getStatusBadge(transaction.status || "PENDING")}</TableCell>
                <TableCell className="text-right">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setSelectedTransaction(transaction)
                      setNewStatus((transaction.status as TransactionStatus) || "PENDING")
                      setNotes("")
                      setUpdateSuccess(false)
                      setUpdateError(null)
                    }}
                  >
                    Update
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    )
  }
}

