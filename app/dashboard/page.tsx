/* eslint-disable @typescript-eslint/no-explicit-any */
"use client"

import { useState, useEffect, useCallback } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { DatePickerWithRange } from "@/components/date-picker-with-range"
import type { DateRange } from "react-day-picker"
import { format } from "date-fns"
import {
  Download,
  ArrowUp,
  ArrowDown,
  Bus,
  Users,
  Ticket,
  CreditCard,
  Loader2,
} from "lucide-react"
import { getAnalyticsData } from "@/lib/trips-service"
import { formatCurrency } from "@/lib/utils"
import { RevenueChart } from "@/components/revenue-chart"
import { PaymentMethodChart } from "@/components/payment-method-chart"
import { Skeleton } from "@/components/ui/skeleton"

/**
 * Timezone-safe helpers (Asia/Manila). We clamp to full local day
 * and convert to UTC Date objects before sending to the service.
 */
const toUTCDate = (local: Date) => {
  // Convert a local-time Date into the equivalent UTC clock time
  return new Date(local.getTime() - local.getTimezoneOffset() * 60000)
}

const startOfLocalDay = (d: Date) => {
  const x = new Date(d)
  x.setHours(0, 0, 0, 0)
  return x
}

const endOfLocalDay = (d: Date) => {
  const x = new Date(d)
  x.setHours(23, 59, 59, 999)
  return x
}

/**
 * Normalize a DateRange (possibly partial) to full-day UTC boundaries
 * based on the user's local timezone (Asia/Manila).
 * - If only one day is chosen, we use that single day's full window.
 * - If both are chosen, we use full-day windows for each bound.
 */
function normalizeRange(range: DateRange | undefined): { from?: Date; to?: Date } {
  if (!range) return {}
  const hasFrom = !!range.from
  const hasTo = !!range.to

  if (!hasFrom && !hasTo) return {}

  if (hasFrom && !hasTo) {
    // Single click on a day => strict single-day window
    const startLocal = startOfLocalDay(range.from as Date)
    const endLocal = endOfLocalDay(range.from as Date)
    return { from: toUTCDate(startLocal), to: toUTCDate(endLocal) }
  }

  // Both present: clamp both ends to full-day bounds
  const startLocal = startOfLocalDay(range.from as Date)
  const endLocal = endOfLocalDay(range.to as Date)
  return { from: toUTCDate(startLocal), to: toUTCDate(endLocal) }
}

export default function DashboardPage() {
  const today = new Date()

  // Default to "Today" so it never mixes with yesterday by default
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: today,
    to: today,
  })

  const [isLoading, setIsLoading] = useState(true)
  const [isExporting, setIsExporting] = useState(false)
  const [analyticsData, setAnalyticsData] = useState<any>(null)

  const fetchData = useCallback(async () => {
    setIsLoading(true)
    try {
      const { from, to } = normalizeRange(dateRange)
      const data = await getAnalyticsData(from, to)
      setAnalyticsData(data)
    } catch (error) {
      console.error("Error fetching analytics data:", error)
    } finally {
      setIsLoading(false)
    }
  }, [dateRange])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  // Currency formatter for PDF with PHP prefix
  const formatPesoCurrency = (amount: any) => {
    const numAmount = typeof amount === "number" ? amount : Number.parseFloat(amount || 0)
    if (isNaN(numAmount)) return "PHP 0.00"
    return `PHP ${numAmount.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ",")}`
  }

  // Format percentage change for stat captions
  const formatPercentageChange = (change: number | undefined) => {
    if (change === undefined) return { value: "0%", isPositive: true }
    const isPositive = change >= 0
    const formattedValue = `${isPositive ? "+" : ""}${change.toFixed(1)}%`
    return { value: formattedValue, isPositive }
  }

  // Export ONLY what this page shows (Summary, Revenue, Payment Methods)
  const handleExport = async () => {
    if (!analyticsData || isExporting) return

    setIsExporting(true)
    try {
      const { jsPDF } = await import("jspdf")
      const autoTable = (await import("jspdf-autotable")).default

      const doc = new jsPDF()

      const dateFrom = dateRange?.from ? format(dateRange.from, "MMM dd, yyyy") : ""
      const dateTo = dateRange?.to ? format(dateRange.to, "MMM dd, yyyy") : ""

      // Header
      doc.setFontSize(20)
      doc.text("Dashboard Report", 105, 15, { align: "center" })
      doc.setFontSize(12)
      doc.text(`Date Range: ${dateFrom} to ${dateTo}`, 105, 25, { align: "center" })

      // Summary Metrics (the four stat cards)
      doc.setFontSize(16)
      doc.text("Summary Metrics", 14, 40)

      autoTable(doc, {
        startY: 45,
        head: [["Metric", "Value"]],
        body: [
          ["Total Revenue", formatPesoCurrency(analyticsData?.totalRevenue || 0)],
          ["Tickets Sold", analyticsData?.totalTrips || 0],
          ["QR Payments", formatPesoCurrency(analyticsData?.qrRevenue || 0)],
          ["Cash Payments", formatPesoCurrency(analyticsData?.cashRevenue || 0)],
        ],
        theme: "grid",
        headStyles: { fillColor: [34, 51, 102], textColor: 255 },
        styles: { fontSize: 10, cellPadding: 3, overflow: "linebreak", cellWidth: "wrap" },
        margin: { left: 14, right: 14 },
      })

      let currentY = (doc as any).lastAutoTable.finalY || 60

      // Revenue (what the Revenue Overview chart displays)
      if (analyticsData?.dailyRevenueData?.length) {
        if (currentY > 220) {
          doc.addPage()
          currentY = 20
        }
        doc.setFontSize(16)
        doc.text("Revenue Overview", 14, currentY + 15)

        const dailyRows = analyticsData.dailyRevenueData.map((item: any) => [
          format(new Date(item.date), "MM/dd/yyyy"),
          formatPesoCurrency(item.amount || 0),
        ])

        autoTable(doc, {
          startY: currentY + 20,
          head: [["Date", "Revenue"]],
          body: dailyRows,
          theme: "grid",
          headStyles: { fillColor: [34, 51, 102], textColor: 255 },
          styles: { fontSize: 10, cellPadding: 3, overflow: "linebreak", cellWidth: "wrap" },
          margin: { left: 14, right: 14 },
        })

        currentY = (doc as any).lastAutoTable.finalY || currentY + 20
      }

      // Payment Methods (what the donut/pie shows)
      {
        const qr = Number(analyticsData?.qrRevenue || 0)
        const cash = Number(analyticsData?.cashRevenue || 0)
        const total = qr + cash
        const qrPct = total > 0 ? `${((qr / total) * 100).toFixed(1)}%` : "0.0%"
        const cashPct = total > 0 ? `${((cash / total) * 100).toFixed(1)}%` : "0.0%"

        if (currentY > 220) {
          doc.addPage()
          currentY = 20
        }
        doc.setFontSize(16)
        doc.text("Payment Methods", 14, currentY + 15)

        autoTable(doc, {
          startY: currentY + 20,
          head: [["Method", "Amount", "Share"]],
          body: [
            ["QR", formatPesoCurrency(qr), qrPct],
            ["Cash", formatPesoCurrency(cash), cashPct],
          ],
          theme: "grid",
          headStyles: { fillColor: [34, 51, 102], textColor: 255 },
          styles: { fontSize: 10, cellPadding: 3 },
          margin: { left: 14, right: 14 },
        })
      }

      // Footer
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

      doc.save(`dashboard-report-${format(new Date(), "yyyy-MM-dd")}.pdf`)
    } catch (error) {
      console.error("Error generating PDF:", error)
      alert("Failed to generate PDF. See console for details.")
    } finally {
      setIsExporting(false)
    }
  }

  return (
    <div className="flex flex-col gap-4 font-body">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight font-heading">Dashboard</h1>
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 w-full sm:w-auto">
          <DatePickerWithRange date={dateRange} onDateChange={setDateRange} />
          <Button
            size="sm"
            className="w-full sm:w-auto text-white"
            onClick={handleExport}
            disabled={isLoading || !analyticsData || isExporting}
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

      <div className="space-y-4">
        {/* Stats Cards */}
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
          {isLoading ? (
            Array(4)
              .fill(0)
              .map((_, i) => (
                <Card key={i} className="min-h-[120px]">
                  <CardHeader className="space-y-0 pb-2">
                    <div className="flex items-center justify-between">
                      <Skeleton className="h-5 w-24 bg-primary/20" />
                      <Skeleton className="h-4 w-4 rounded-full bg-primary/20" />
                    </div>
                  </CardHeader>
                  <CardContent>
                    <Skeleton className="h-7 w-28 mb-1 bg-primary/20" />
                    <Skeleton className="h-4 w-32 bg-primary/20" />
                  </CardContent>
                </Card>
              ))
          ) : (
            <>
              <Card className="min-h-[120px]">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <div className="flex items-center">
                    <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
                  </div>
                  <CreditCard className="h-4 w-4 text-primary" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {formatCurrency(analyticsData?.totalRevenue || 0)}
                  </div>
                  {(() => {
                    const { value, isPositive } = formatPercentageChange(analyticsData?.revenueChange)
                    return (
                      <p className="text-xs flex items-center mt-1">
                        {isPositive ? (
                          <ArrowUp className="mr-1 h-3 w-3 text-emerald-500" />
                        ) : (
                          <ArrowDown className="mr-1 h-3 w-3 text-red-500" />
                        )}
                        {value} from previous period
                      </p>
                    )
                  })()}
                </CardContent>
              </Card>

              <Card className="min-h-[120px]">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <div className="flex items-center">
                    <CardTitle className="text-sm font-medium">Tickets Sold</CardTitle>
                  </div>
                  <Ticket className="h-4 w-4 text-primary" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{analyticsData?.totalTrips || 0}</div>
                  {(() => {
                    const { value, isPositive } = formatPercentageChange(analyticsData?.tripsChange)
                    return (
                      <p className="text-xs flex items-center mt-1">
                        {isPositive ? (
                          <ArrowUp className="mr-1 h-3 w-3 text-emerald-500" />
                        ) : (
                          <ArrowDown className="mr-1 h-3 w-3 text-red-500" />
                        )}
                        {value} from previous period
                      </p>
                    )
                  })()}
                </CardContent>
              </Card>

              <Card className="min-h-[120px]">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <div className="flex items-center">
                    <CardTitle className="text-sm font-medium">QR Payments</CardTitle>
                  </div>
                  <Users className="h-4 w-4 text-primary" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {formatCurrency(analyticsData?.qrRevenue || 0)}
                  </div>
                  {(() => {
                    const { value, isPositive } = formatPercentageChange(analyticsData?.qrRevenueChange)
                    return (
                      <p className="text-xs flex items-center mt-1">
                        {isPositive ? (
                          <ArrowUp className="mr-1 h-3 w-3 text-emerald-500" />
                        ) : (
                          <ArrowDown className="mr-1 h-3 w-3 text-red-500" />
                        )}
                        {value} from previous period
                      </p>
                    )
                  })()}
                </CardContent>
              </Card>

              <Card className="min-h-[120px]">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <div className="flex items-center">
                    <CardTitle className="text-sm font-medium">Cash Payments</CardTitle>
                  </div>
                  <Bus className="h-4 w-4 text-primary" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {formatCurrency(analyticsData?.cashRevenue || 0)}
                  </div>
                  {(() => {
                    const { value, isPositive } = formatPercentageChange(analyticsData?.cashRevenueChange)
                    return (
                      <p className="text-xs flex items-center mt-1">
                        {isPositive ? (
                          <ArrowUp className="mr-1 h-3 w-3 text-emerald-500" />
                        ) : (
                          <ArrowDown className="mr-1 h-3 w-3 text-red-500" />
                        )}
                        {value} from previous period
                      </p>
                    )
                  })()}
                </CardContent>
              </Card>
            </>
          )}
        </div>

        {/* Charts */}
        <div className="grid gap-4 grid-cols-1 lg:grid-cols-7">
          <Card className="col-span-full lg:col-span-4">
            <CardHeader>
              <div className="flex items-center">
                <CardTitle className="font-heading">Revenue Overview</CardTitle>
              </div>
              <CardDescription>
                {dateRange?.from && dateRange?.to ? (
                  <>
                    {format(dateRange.from, "LLL dd, y")} - {format(dateRange.to, "LLL dd, y")}
                  </>
                ) : (
                  "Today"
                )}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="h-[300px] flex items-center justify-center">
                  <Skeleton className="h-[280px] w-full rounded-md bg-primary/20" />
                </div>
              ) : (
                <RevenueChart data={analyticsData?.dailyRevenueData || []} />
              )}
            </CardContent>
          </Card>

          <Card className="col-span-full lg:col-span-3">
            <CardHeader>
              <div className="flex items-center">
                <CardTitle className="font-heading">Payment Methods</CardTitle>
              </div>
              <CardDescription>Distribution between QR and cash payments</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="h-[300px] flex items-center justify-center">
                  <Skeleton className="h-[280px] w-full rounded-md bg-primary/20" />
                </div>
              ) : (
                <PaymentMethodChart
                  qrRevenue={analyticsData?.qrRevenue || 0}
                  cashRevenue={analyticsData?.cashRevenue || 0}
                />
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
