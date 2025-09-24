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
import { subDays, format, startOfDay, endOfDay } from "date-fns"
import { Search, Download, Loader2, QrCode, Banknote } from "lucide-react"
import { getAllTrips, getTripsByDateRange } from "@/lib/trips-service"
import { formatDate } from "@/lib/utils"
import { ScrollAreaScrollbar } from "@radix-ui/react-scroll-area"
import type { Styles, HAlignType } from "jspdf-autotable"

function normalizeRange(range: DateRange | undefined): { from?: Date; to?: Date } {
  if (!range) return {}
  const from = range.from ? startOfDay(range.from) : undefined
  const to = range.to ? endOfDay(range.to) : range.from ? endOfDay(range.from) : undefined
  return { from, to }
}

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
      const { from, to } = normalizeRange(dateRange)
      if (from && to) {
        tripsData = await getTripsByDateRange(from, to)
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
          (trip.passengerName || "").toLowerCase().includes(query) ||
          (trip.from || "").toLowerCase().includes(query) ||
          (trip.to || "").toLowerCase().includes(query) ||
          (trip.busNumber && trip.busNumber.toLowerCase().includes(query)) ||
          (trip.transactionId && String(trip.transactionId).toLowerCase().includes(query)),
      )
      setFilteredTrips(filtered)
    }
  }, [searchQuery, trips])

  // ------- Helpers for PDF export & formatting -------
  const safeFareNumber = (fare: any) => {
    if (typeof fare === "number") return fare
    if (typeof fare === "string") {
      const num = Number.parseFloat(fare.replace(/[^\d.-]/g, ""))
      return Number.isFinite(num) ? num : 0
    }
    return 0
  }

  const formatPHP = (amount: any) => {
    const n = typeof amount === "number" ? amount : Number.parseFloat(amount || 0)
    if (Number.isNaN(n)) return "PHP 0.00"
    return `PHP ${n.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ",")}`
  }

  // Normalize punctuation to avoid weird glyphs in PDF (e.g., "!’")
  const normalizePunctuation = (s: string) =>
    s
      .replace(/[\u2018\u2019\u201A\u201B]/g, "'")
      .replace(/[\u201C\u201D\u201E\u201F]/g, '"')
      .replace(/^\s*[¡!]['’‛"]?\s*/, "")
      .replace(/^\s+|\s+$/g, "")

  const breakLongWords = (text: string, max = 18) =>
    text.replace(new RegExp(`(\\S{${max}})(?=\\S)`, "g"), "$1\u200b")

  const abbreviateCountry = (text: string) => text.replace(/,\s*Philippines\b/gi, ", PH")

  const preparePlaceForPdf = (place?: string) => {
    const cleaned = normalizePunctuation(place || "")
    const abbreviated = abbreviateCountry(cleaned)
    return breakLongWords(abbreviated).replace(/, /g, ",\n")
  }

  const routeForPdf = (from?: string, to?: string) => {
    const origin = preparePlaceForPdf(from)
    const dest = preparePlaceForPdf(to)
    return `From: ${origin}\nTo: ${dest}`
  }

  const handleExport = async () => {
    if (isExporting) return
    setIsExporting(true)
    try {
      const { jsPDF } = await import("jspdf")
      const autoTable = (await import("jspdf-autotable")).default

      const anyLongRoute = filteredTrips.some(
        (t) => `${t?.from || ""} ${t?.to || ""}`.length >= 40 || String(t?.transactionId || "").length > 24,
      )

      const doc = new jsPDF({ orientation: anyLongRoute ? "landscape" : "portrait" })
      const pageWidth = doc.internal.pageSize.getWidth() as number
      const pageHeight = doc.internal.pageSize.getHeight() as number

      const dateFrom = dateRange?.from ? format(dateRange.from, "MMM dd, yyyy") : ""
      const dateTo = dateRange?.to ? format(dateRange.to, "MMM dd, yyyy") : ""

      doc.setFontSize(20)
      doc.text("Transactions Report", pageWidth / 2, 15, { align: "center" })
      doc.setFontSize(12)
      doc.text(`Date Range: ${dateFrom} to ${dateTo}`, pageWidth / 2, 25, { align: "center" })

      const rows = filteredTrips.map((t) => [
        formatDate(t.timestamp) || "",
        t.passengerName || "",
        routeForPdf(t.from, t.to),
        t.busNumber || "N/A",
        t.paymentMethod || "",
        formatPHP(safeFareNumber(t.fare)),
        t.transactionId ?? "",
      ])

      // ---- Explicit column styles typing ----
      const longCols: Record<string, Partial<Styles>> = {
        "0": { cellWidth: 32 },
        "1": { cellWidth: 40 },
        "2": { cellWidth: 78 },
        "3": { cellWidth: 18 },
        "4": { cellWidth: 24 },
        "5": { cellWidth: 28, halign: "right" as HAlignType },
        "6": { cellWidth: 52 },
      }

      const normalCols: Record<string, Partial<Styles>> = {
        "0": { cellWidth: 26 },
        "1": { cellWidth: 34 },
        "2": { cellWidth: 70 },
        "3": { cellWidth: 16 },
        "4": { cellWidth: 22 },
        "5": { cellWidth: 24, halign: "right" as HAlignType },
        "6": { cellWidth: 40 },
      }

      const columnStyles: Record<string, Partial<Styles>> = anyLongRoute ? longCols : normalCols

      autoTable(doc, {
        startY: 35,
        head: [["Date", "Passenger", "Route", "Bus #", "Payment", "Fare", "Transaction ID"]],
        body: rows,
        theme: "grid",
        tableWidth: "auto",
        headStyles: { fillColor: [34, 51, 102], textColor: 255 },
        styles: {
          fontSize: 9,
          cellPadding: 3,
          overflow: "linebreak",
          cellWidth: "wrap",
          lineWidth: 0.1,
          lineColor: 200,
          minCellHeight: 8,
          valign: "top",
        },
        columnStyles,
        margin: { left: 14, right: 14 },
        rowPageBreak: "auto",
        didParseCell: (data: any) => {
          if (data.section === "body" && data.column.index === 2) {
            const txt = String(data.cell.raw || "")
            if (txt.length > 300) data.cell.styles.fontSize = 7
            else if (txt.length > 140) data.cell.styles.fontSize = 8
          }
        },
        didDrawPage: (data: any) => {
          doc.setFontSize(8)
          const pageNumber = doc.getNumberOfPages()
          const currentPage = data.pageNumber
          doc.text(
            `Generated on ${format(new Date(), "MMM dd, yyyy 'at' h:mm a")} - Page ${currentPage} of ${pageNumber}`,
            pageWidth / 2,
            pageHeight - 10,
            { align: "center" },
          )
        },
      })

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
                      <TableHead className="min-w-[180px]">Route</TableHead>
                      <TableHead className="min-w-[80px]">Bus #</TableHead>
                      <TableHead className="min-w-[100px]">Payment</TableHead>
                      <TableHead className="min-w-[100px] text-right">Fare</TableHead>
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
                          <TableCell className="font-medium truncate max-w-[160px]">
                            {trip.passengerName}
                          </TableCell>
                          <TableCell className="truncate max-w-[260px]">
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
                          <TableCell className="text-right font-medium">
                            {formatPHP(safeFareNumber(trip.fare))}
                          </TableCell>
                          <TableCell className="font-mono text-xs truncate max-w-[220px] hidden md:table-cell">
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
