/* eslint-disable @typescript-eslint/no-explicit-any */
"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { DatePickerWithRange } from "@/components/date-picker-with-range"
import type { DateRange } from "react-day-picker"
import { subDays } from "date-fns"
import { Search, Download, Loader2, QrCode, Banknote } from "lucide-react"
import { getAllTrips, getTripsByDateRange } from "@/lib/trips-service"
import { formatDate } from "@/lib/utils"

export default function TransactionsPage() {
  const [trips, setTrips] = useState<any[]>([])
  const [filteredTrips, setFilteredTrips] = useState<any[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [isLoading, setIsLoading] = useState(true)
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: subDays(new Date(), 30),
    to: new Date(),
  })

  const fetchTrips = async () => {
    setIsLoading(true)
    try {
      let tripsData
      if (dateRange?.from && dateRange?.to) {
        tripsData = await getTripsByDateRange(dateRange.from, dateRange.to)
      } else {
        tripsData = await getAllTrips()
      }
      setTrips(tripsData)
      setFilteredTrips(tripsData)
    } catch (error) {
      console.error("Error fetching trips:", error)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchTrips()
  }, [dateRange]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (searchQuery.trim() === "") {
      setFilteredTrips(trips)
    } else {
      const query = searchQuery.toLowerCase()
      const filtered = trips.filter(
        (trip) =>
          trip.passengerName.toLowerCase().includes(query) ||
          trip.from.toLowerCase().includes(query) ||
          trip.to.toLowerCase().includes(query) ||
          (trip.busNumber && trip.busNumber.toLowerCase().includes(query)) ||
          trip.transactionId.includes(query),
      )
      setFilteredTrips(filtered)
    }
  }, [searchQuery, trips])

  const handleExport = () => {
    // Create CSV content
    const headers = ["Date", "Passenger", "From", "To", "Bus #", "Payment Method", "Fare", "Transaction ID"]
    const csvContent = [
      headers.join(","),
      ...filteredTrips.map((trip) =>
        [
          formatDate(trip.timestamp),
          trip.passengerName,
          trip.from,
          trip.to,
          trip.busNumber || "N/A",
          trip.paymentMethod,
          trip.fare,
          trip.transactionId,
        ].join(","),
      ),
    ].join("\n")

    // Create download link
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.setAttribute("href", url)
    link.setAttribute("download", `transactions-export-${new Date().toISOString().split("T")[0]}.csv`)
    link.style.visibility = "hidden"
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Transactions</h1>
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2">
          <DatePickerWithRange date={dateRange} onDateChange={setDateRange} />
          <Button variant="outline" size="sm" onClick={handleExport} className="w-full sm:w-auto">
            <Download className="mr-2 h-4 w-4" />
            <span>Export</span>
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Transaction History</CardTitle>
          <CardDescription>View all ticket sales and transactions</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-4 gap-4">
            <div className="relative w-full sm:max-w-sm">
              <Search className="absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search transactions..."
                className="pl-8 w-full"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>

          {isLoading ? (
            <div className="flex justify-center items-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
            <div className="rounded-md border">
              <ScrollArea className="w-full" orientation="horizontal">
                <Table className="w-full">
                  <TableHeader>
                    <TableRow>
                      <TableHead className="min-w-[100px]">Date</TableHead>
                      <TableHead className="min-w-[120px]">Passenger</TableHead>
                      <TableHead className="min-w-[150px]">Route</TableHead>
                      <TableHead className="min-w-[80px]">Bus #</TableHead>
                      <TableHead className="min-w-[100px]">Payment</TableHead>
                      <TableHead className="min-w-[80px] text-right">Fare</TableHead>
                      <TableHead className="min-w-[180px] hidden md:table-cell">Transaction ID</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredTrips.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                          No transactions found
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredTrips.map((trip) => (
                        <TableRow key={trip.id}>
                          <TableCell>{formatDate(trip.timestamp)}</TableCell>
                          <TableCell className="font-medium truncate max-w-[120px]">{trip.passengerName}</TableCell>
                          <TableCell className="truncate max-w-[150px]">
                            {trip.from} → {trip.to}
                          </TableCell>
                          <TableCell>{trip.busNumber || "N/A"}</TableCell>
                          <TableCell>
                            <Badge variant={trip.paymentMethod === "QR" ? "default" : "outline"}>
                              {trip.paymentMethod === "QR" ? (
                                <QrCode className="mr-1 h-3 w-3" />
                              ) : (
                                <Banknote className="mr-1 h-3 w-3" />
                              )}
                              {trip.paymentMethod}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right font-medium">{trip.fare}</TableCell>
                          <TableCell className="font-mono text-xs truncate max-w-[180px] hidden md:table-cell">
                            {trip.transactionId}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </ScrollArea>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

