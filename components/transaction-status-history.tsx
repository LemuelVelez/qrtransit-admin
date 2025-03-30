import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { formatDate } from "@/lib/utils"
import { CheckCircle, XCircle, Clock } from "lucide-react"

// This is a mock component since we don't have actual status history data
// In a real implementation, you would fetch this data from your database
export function TransactionStatusHistory({ transactionId }: { transactionId: string }) {
  // Mock status history data
  const statusHistory = [
    {
      status: "PENDING",
      timestamp: Date.now() - 86400000 * 3, // 3 days ago
      notes: "Transaction created",
      updatedBy: "System",
    },
    {
      status: "COMPLETED",
      timestamp: Date.now() - 86400000, // 1 day ago
      notes: "Transaction verified and completed",
      updatedBy: "admin@example.com",
    },
  ]

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

  return (
    <Card>
      <CardHeader>
        <CardTitle>Status History</CardTitle>
        <CardDescription>Transaction ID: {transactionId}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {statusHistory.map((history, index) => (
            <div key={index} className="flex items-start gap-2 pb-4 border-b last:border-0 last:pb-0">
              <div className="mt-0.5">{getStatusBadge(history.status)}</div>
              <div className="flex-1">
                <p className="text-sm text-muted-foreground">{formatDate(history.timestamp)}</p>
                <p className="mt-1">{history.notes}</p>
                <p className="text-xs text-muted-foreground mt-1">Updated by: {history.updatedBy}</p>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

