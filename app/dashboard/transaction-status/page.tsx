"use client"

import { useState, useEffect } from "react"
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
import type { DateRange } from "react-day-picker"
import { subDays } from "date-fns"
import { Search, Loader2, CheckCircle, XCircle, Clock, AlertCircle } from "lucide-react"
import { formatCurrency, formatDate } from "@/lib/utils"
import {
  getAllTransactions,
  getTransactionsByStatus,
  updateTransactionStatus,
  type Transaction,
  type TransactionStatus,
} from "@/lib/transaction-service"

export default function TransactionStatusPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [filteredTransactions, setFilteredTransactions] = useState<Transaction[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState<TransactionStatus | "all">("PENDING")
  const [isLoading, setIsLoading] = useState(true)
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null)
  const [isUpdating, setIsUpdating] = useState(false)
  const [newStatus, setNewStatus] = useState<TransactionStatus>("COMPLETED")
  const [notes, setNotes] = useState("")
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: subDays(new Date(), 30),
    to: new Date(),
  })
  const [activeTab, setActiveTab] = useState("pending")
  const [updateSuccess, setUpdateSuccess] = useState(false)
  const [updateError, setUpdateError] = useState<string | null>(null)

  useEffect(() => {
    fetchTransactions()
  }, [activeTab])

  const fetchTransactions = async () => {
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

      setTransactions(fetchedTransactions)
      setFilteredTransactions(fetchedTransactions)
    } catch (error) {
      console.error("Error fetching transactions:", error)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    filterTransactions()
  }, [searchQuery, transactions])

  const filterTransactions = () => {
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
  }

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
          <Badge className="bg-emerald-500 hover:bg-emerald-600">
            <CheckCircle className="mr-1 h-3 w-3" />
            Completed
          </Badge>
        )
      case "PENDING":
        return (
          <Badge variant="outline" className="text-amber-500 border-amber-500">
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
        <h1 className="text-3xl font-bold tracking-tight">Transaction Status Management</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Manage Transaction Status</CardTitle>
          <CardDescription>View and update the status of transactions</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="pending" value={activeTab} onValueChange={setActiveTab} className="space-y-4">
            <div className="flex items-center justify-between">
              <TabsList>
                <TabsTrigger value="pending">Pending</TabsTrigger>
                <TabsTrigger value="completed">Completed</TabsTrigger>
                <TabsTrigger value="failed">Failed</TabsTrigger>
                <TabsTrigger value="all">All Transactions</TabsTrigger>
              </TabsList>

              <div className="relative">
                <Search className="absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search transactions..."
                  className="pl-8 w-[300px]"
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
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Update Transaction Status</DialogTitle>
            <DialogDescription>Change the status of transaction {selectedTransaction?.id}</DialogDescription>
          </DialogHeader>

          {updateSuccess && (
            <Alert className="bg-emerald-50 text-emerald-800 border-emerald-200">
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
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-muted-foreground">Transaction ID</Label>
                    <p className="font-mono text-sm">{selectedTransaction.id}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Amount</Label>
                    <p className="font-medium">{formatCurrency(selectedTransaction.amount)}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
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
                <SelectContent>
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

          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedTransaction(null)} disabled={isUpdating}>
              Cancel
            </Button>
            <Button onClick={handleUpdateStatus} disabled={isUpdating || updateSuccess}>
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
        <div className="flex justify-center items-center py-8">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      )
    }

    return (
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Transaction ID</TableHead>
              <TableHead>User ID</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Amount</TableHead>
              <TableHead>Description</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredTransactions.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                  No transactions found
                </TableCell>
              </TableRow>
            ) : (
              filteredTransactions.map((transaction) => (
                <TableRow key={transaction.id}>
                  <TableCell className="font-mono text-xs">{transaction.id}</TableCell>
                  <TableCell>{transaction.userId}</TableCell>
                  <TableCell>{getTransactionTypeLabel(transaction.type)}</TableCell>
                  <TableCell>{formatCurrency(transaction.amount)}</TableCell>
                  <TableCell className="max-w-[200px] truncate">{transaction.description}</TableCell>
                  <TableCell>{formatDate(transaction.timestamp)}</TableCell>
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
                      Update Status
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    )
  }
}

