import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { formatCurrency, formatDate } from "@/lib/utils"
import { CheckCircle, XCircle, Clock } from "lucide-react"
import type { Transaction } from "@/lib/transaction-service"

interface TransactionDetailsProps {
  transaction: Transaction
}

export function TransactionDetails({ transaction }: TransactionDetailsProps) {
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
    <Card>
      <CardHeader>
        <CardTitle>Transaction Details</CardTitle>
        <CardDescription>Transaction ID: {transaction.id}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-sm font-medium text-muted-foreground">Type</p>
            <p>{getTransactionTypeLabel(transaction.type)}</p>
          </div>
          <div>
            <p className="text-sm font-medium text-muted-foreground">Amount</p>
            <p className="font-medium">{formatCurrency(transaction.amount)}</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-sm font-medium text-muted-foreground">Date</p>
            <p>{formatDate(transaction.timestamp)}</p>
          </div>
          <div>
            <p className="text-sm font-medium text-muted-foreground">Status</p>
            <div className="mt-1">{getStatusBadge(transaction.status || "PENDING")}</div>
          </div>
        </div>

        <div>
          <p className="text-sm font-medium text-muted-foreground">User ID</p>
          <p className="font-mono text-sm">{transaction.userId}</p>
        </div>

        {transaction.recipientId && (
          <div>
            <p className="text-sm font-medium text-muted-foreground">Recipient ID</p>
            <p className="font-mono text-sm">{transaction.recipientId}</p>
          </div>
        )}

        <div>
          <p className="text-sm font-medium text-muted-foreground">Description</p>
          <p>{transaction.description}</p>
        </div>

        {transaction.reference && (
          <div>
            <p className="text-sm font-medium text-muted-foreground">Reference</p>
            <p className="font-mono text-sm">{transaction.reference}</p>
          </div>
        )}

        {transaction.balance !== undefined && (
          <div>
            <p className="text-sm font-medium text-muted-foreground">Balance After Transaction</p>
            <p className="font-medium">{formatCurrency(transaction.balance)}</p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

