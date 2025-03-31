/* eslint-disable @typescript-eslint/no-explicit-any */

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Loader2, ArrowLeft } from "lucide-react"
import { getTransactionById } from "@/lib/transaction-service"
import { TransactionDetails } from "@/components/transaction-details"
import { TransactionStatusHistory } from "@/components/transaction-status-history"

export default function TransactionDetailPage({ params }: { params: { id: string } }) {
  const [transaction, setTransaction] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    const fetchTransaction = async () => {
      setIsLoading(true)
      try {
        const data = await getTransactionById(params.id)
        setTransaction(data)
      } catch (error) {
        console.error("Error fetching transaction:", error)
      } finally {
        setIsLoading(false)
      }
    }

    if (params.id) {
      fetchTransaction()
    }
  }, [params.id])

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  if (!transaction) {
    return (
      <div className="flex flex-col gap-4">
        <div className="flex items-center">
          <Button variant="ghost" size="sm" onClick={() => router.back()} className="mr-2">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <h1 className="text-3xl font-bold tracking-tight">Transaction Not Found</h1>
        </div>
        <p>The transaction with ID {params.id} could not be found.</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center">
        <Button variant="ghost" size="sm" onClick={() => router.back()} className="mr-2">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
        <h1 className="text-3xl font-bold tracking-tight">Transaction Details</h1>
      </div>

      <Tabs defaultValue="details" className="space-y-4">
        <TabsList>
          <TabsTrigger value="details">Details</TabsTrigger>
          <TabsTrigger value="history">Status History</TabsTrigger>
        </TabsList>

        <TabsContent value="details" className="space-y-4">
          <TransactionDetails transaction={transaction} />
        </TabsContent>

        <TabsContent value="history" className="space-y-4">
          <TransactionStatusHistory transactionId={transaction.id} />
        </TabsContent>
      </Tabs>
    </div>
  )
}
