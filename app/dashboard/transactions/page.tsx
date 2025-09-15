// app/dashboard/transactions/page.tsx
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
import { format, subDays } from "date-fns"
import { Search, Download, Loader2, QrCode, Banknote } from "lucide-react"
import { getAllTrips, getTripsByDateRange } from "@/lib/trips-service"
import { formatDate } from "@/lib/utils"
import { ScrollAreaScrollbar } from "@radix-ui/react-scroll-area"

export default function TransactionsPage() {
  const [trips, setTrips] = useState<any[]>([])
  const [filteredTrips, setFilteredTrips] = useState<any[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [isLoading, setIsLoading] = useState(true)
  const [isExporting, setIsExporting] = useState(false)
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dateRange])

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
          (trip.transactionId && String(trip.transactionId).toLowerCase().includes(query)),
      )
      setFilteredTrips(filtered)
    }
  }, [searchQuery, trips])

  // --- Helpers for PDF (mirrors dashboard export style) ---
  const safeFareNumber = (fare: any) => {
    if (typeof fare === "number") return fare
    if (typeof fare === "string") {
      const num = Number.parseFloat(fare.replace(/[^\d.-]/g, ""))
      return Number.isFinite(num) ? num : 0
    }
    return 0
  }

  const formatPesoCurrency = (amount: any) => {
    const numAmount = typeof amount === "number" ? amount : Number.parseFloat(amount || 0)
    if (isNaN(numAmount)) return "PHP 0.00"
    return `PHP ${numAmount.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ",")}`
  }

  const computeSummary = (rows: any[]) => {
    const totals = {
      count: rows.length,
      revenue: 0,
      byMethod: {} as Record<string, { count: number; revenue: number }>,
    }
    for (const r of rows) {
      const amt = safeFareNumber(r.fare)
      totals.revenue += amt
      const method = (r.paymentMethod || "Unknown").toString()
      if (!totals.byMethod[method]) totals.byMethod[method] = { count: 0, revenue: 0 }
      totals.byMethod[method].count += 1
      totals.byMethod[method].revenue += amt
    }
    return totals
  }

  const handleExport = async () => {
    if (isExporting) return
    setIsExporting(true)
    try {
      // Dynamic imports to avoid SSR issues – same pattern as dashboard
      const { jsPDF } = await import("jspdf")
      const autoTable = (await import("jspdf-autotable")).default

      const doc = new jsPDF()

      const dateFrom = dateRange?.from ? format(dateRange.from, "MMM dd, yyyy") : ""
      const dateTo = dateRange?.to ? format(dateRange.to, "MMM dd, yyyy") : ""

      // Title
      doc.setFontSize(20)
      doc.text("Transactions Report", 105, 15, { align: "center" })

      // Date range
      doc.setFontSize(12)
      doc.text(`Date Range: ${dateFrom} to ${dateTo}`, 105, 25, { align: "center" })

      // Summary section
      const summary = computeSummary(filteredTrips)
      const methods = Object.entries(summary.byMethod).map(([m, v]) => [
        m,
        v.count,
        formatPesoCurrency(v.revenue),
      ])

      doc.setFontSize(16)
      doc.text("Summary", 14, 40)

      autoTable(doc, {
        startY: 45,
        head: [["Metric", "Value"]],
        body: [
          ["Total Transactions", summary.count],
          ["Total Revenue", formatPesoCurrency(summary.revenue)],
        ],
        theme: "grid",
        headStyles: { fillColor: [34, 51, 102], textColor: 255 },
        styles: { fontSize: 10, cellPadding: 3, overflow: "linebreak", cellWidth: "wrap" },
      })

      let y = (doc as any).lastAutoTable.finalY

      if (methods.length > 0) {
        doc.setFontSize(14)
        doc.text("By Payment Method", 14, y + 12)

        autoTable(doc, {
          startY: y + 17,
          head: [["Method", "Count", "Revenue"]],
          body: methods,
          theme: "grid",
          headStyles: { fillColor: [34, 51, 102], textColor: 255 },
          styles: { fontSize: 10, cellPadding: 3, overflow: "linebreak" },
          columnStyles: { 0: { cellWidth: 50 }, 1: { cellWidth: 25 }, 2: { cellWidth: 40 } },
          margin: { left: 14, right: 14 },
        })

        y = (doc as any).lastAutoTable.finalY
      }

      // Transactions table
      doc.setFontSize(16)
      if (y > 180) {
        doc.addPage()
        doc.text("Transactions", 14, 20)
      } else {
        doc.text("Transactions", 14, y + 15)
      }

      const rows = filteredTrips.map((t) => {
        const fareVal = safeFareNumber(t.fare)
        const dateStr = t.timestamp ? format(new Date(t.timestamp), "MM/dd/yyyy") : ""
        const passenger = t.passengerName || ""
        const route = `${t.from || ""} to ${t.to || ""}`.replace(/\bp\b/g, "to")
        const busNo = t.busNumber || "N/A"
        const method = t.paymentMethod || ""
        const fare = formatPesoCurrency(fareVal)
        const txid = t.transactionId || ""
        return [dateStr, passenger, route, busNo, method, fare, txid]
      })

      autoTable(doc, {
        startY: y > 180 ? 25 : y + 20,
        head: [["Date", "Passenger", "Route", "Bus #", "Payment", "Fare", "Transaction ID"]],
        body: rows,
        theme: "grid",
        headStyles: { fillColor: [34, 51, 102], textColor: 255 },
        styles: {
          fontSize: 9,
          cellPadding: 3,
          overflow: "linebreak",
          cellWidth: "wrap",
        },
        columnStyles: {
          0: { cellWidth: 22 },
          1: { cellWidth: 32 },
          2: { cellWidth: 62 },
          3: { cellWidth: 16 },
          4: { cellWidth: 22 },
          5: { cellWidth: 24 },
          6: { cellWidth: 40 },
        },
        margin: { left: 14, right: 14 },
      })

      // Footer with timestamp + page numbers
      const pageCount = doc.getNumberOfPages()
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i)
        doc.setFontSize(8)
        doc.text(
          `Generated on ${format(new Date(), "MMM dd, yyyy 'at' h:mm a")} - Page ${i} of ${pageCount}`,
          105,
          doc.internal.pageSize.height - 10,
          { align: "center" },
        )
      }

      doc.save(`transactions-report-${format(new Date(), "yyyy-MM-dd")}.pdf`)
    } catch (err) {
      console.error("Error generating transactions PDF:", err)
      alert("Failed to generate PDF. See console for details.")
    } finally {
      setIsExporting(false)
    }
  }

  return (
    <div className="flex flex-col gap-4 font-body">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight font-heading">Transactions</h1>
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 w-full sm:w-auto">
          <DatePickerWithRange date={dateRange} onDateChange={setDateRange} />
          <Button
            variant="default"
            size="sm"
            className="w-full sm:w-auto text-white"
            onClick={handleExport}
            disabled={isLoading || isExporting || filteredTrips.length === 0}
            aria-busy={isExporting}
          >
            {isExporting ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Download className="mr-2 h-4 w-4" />
            )}
            <span>{isExporting ? "Exporting…" : "Export PDF"}</span>
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
              <ScrollArea className="w-full">
                <Table className="w-full">
                  <TableHeader>
                    <TableRow className="hover:bg-primary/50">
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
                        <TableRow key={trip.id} className="hover:bg-primary/30">
                          <TableCell>{formatDate(trip.timestamp)}</TableCell>
                          <TableCell className="font-medium truncate max-w-[120px]">
                            {trip.passengerName}
                          </TableCell>
                          <TableCell className="truncate max-w-[150px]">
                            {trip.from} → {trip.to}
                          </TableCell>
                          <TableCell>{trip.busNumber || "N/A"}</TableCell>
                          <TableCell>
                            <Badge
                              variant={trip.paymentMethod === "QR" ? "default" : "outline"}
                              className="bg-primary border-primary hover:bg-primary/90 text-white"
                            >
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
                <ScrollAreaScrollbar orientation="horizontal" />
              </ScrollArea>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
