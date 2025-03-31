/* eslint-disable @typescript-eslint/no-explicit-any */
"use client"

import { useState, useEffect } from "react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Loader2, QrCode, Banknote } from "lucide-react"
import { getAllTrips } from "@/lib/trips-service"
import { formatDate } from "@/lib/utils"

export function RecentTransactionsTable() {
  const [transactions, setTransactions] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const fetchTransactions = async () => {
      setIsLoading(true)
      try {
        const trips = await getAllTrips()
        // Get only the 5 most recent transactions
        setTransactions(trips.slice(0, 5))
      } catch (error) {
        console.error("Error fetching transactions:", error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchTransactions()
  }, [])

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="rounded-md border overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Date</TableHead>
            <TableHead>Passenger</TableHead>
            <TableHead>Route</TableHead>
            <TableHead>Payment</TableHead>
            <TableHead className="text-right">Fare</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {transactions.length === 0 ? (
            <TableRow>
              <TableCell colSpan={5} className="text-center py-6 text-muted-foreground">
                No transactions found
              </TableCell>
            </TableRow>
          ) : (
            transactions.map((transaction) => (
              <TableRow key={transaction.id}>
                <TableCell className="whitespace-nowrap">{formatDate(transaction.timestamp)}</TableCell>
                <TableCell className="font-medium">{transaction.passengerName}</TableCell>
                <TableCell className="whitespace-nowrap">
                  {transaction.from} → {transaction.to}
                </TableCell>
                <TableCell>
                  <Badge variant={transaction.paymentMethod === "QR" ? "default" : "outline"}>
                    {transaction.paymentMethod === "QR" ? (
                      <QrCode className="mr-1 h-3 w-3" />
                    ) : (
                      <Banknote className="mr-1 h-3 w-3" />
                    )}
                    {transaction.paymentMethod}
                  </Badge>
                </TableCell>
                <TableCell className="text-right font-medium">{transaction.fare}</TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  )
}

