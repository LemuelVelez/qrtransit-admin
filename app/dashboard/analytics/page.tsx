/* eslint-disable @typescript-eslint/no-explicit-any */
"use client"

import { useState, useEffect, useCallback } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { DatePickerWithRange } from "@/components/date-picker-with-range"
import type { DateRange } from "react-day-picker"
import { format, subDays } from "date-fns"
import { Download, Loader2 } from "lucide-react"
import { getAnalyticsData } from "@/lib/trips-service"
import { formatCurrency } from "@/lib/utils"
import { RevenueChart } from "@/components/revenue-chart"
import { PaymentMethodChart } from "@/components/payment-method-chart"

/**
 * EXPORT SCOPE (strictly what's on this page):
 * - Summary Metrics (Total Revenue, QR Payments, Cash Payments, Total Tickets)
 * - Revenue Trends (tabular version of the chart)
 * - Payment Distribution (QR vs Cash, with percentages)
 * Notes:
 * - Export uses explicit "PHP" currency format as requested.
 * - Removed any sections not shown on this page (e.g., Top Routes, Recent Transactions).
 */

export default function AnalyticsPage() {
  const [isLoading, setIsLoading] = useState(true)
  const [isExporting, setIsExporting] = useState(false)
  const [analyticsData, setAnalyticsData] = useState<any>(null)
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: subDays(new Date(), 30),
    to: new Date(),
  })
  const [activeTab, setActiveTab] = useState("revenue")

  const fetchData = useCallback(async () => {
    setIsLoading(true)
    try {
      const data = await getAnalyticsData(dateRange?.from, dateRange?.to)
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

  // Explicit "PHP" currency formatter for the PDF export
  const formatPHP = (amount: any) => {
    const n = typeof amount === "number" ? amount : Number.parseFloat(amount || 0)
    if (Number.isNaN(n)) return "PHP 0.00"
    return `PHP ${n.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ",")}`
  }

  // Export PDF using ONLY data visible on this page
  const handleExport = async () => {
    if (!analyticsData || isExporting) return

    setIsExporting(true)
    try {
      const { jsPDF } = await import("jspdf")
      const autoTable = (await import("jspdf-autotable")).default

      const doc = new jsPDF()

      const dateFrom = dateRange?.from ? format(dateRange.from, "MMM dd, yyyy") : ""
      const dateTo = dateRange?.to ? format(dateRange.to, "MMM dd, yyyy") : ""

      // Title
      doc.setFontSize(20)
      doc.text("Analytics Report", 105, 15, { align: "center" })
      doc.setFontSize(12)
      doc.text(`Date Range: ${dateFrom} to ${dateTo}`, 105, 25, { align: "center" })

      // Summary Metrics (mirror the "Revenue Summary" card)
      doc.setFontSize(16)
      doc.text("Summary Metrics", 14, 40)
      autoTable(doc, {
        startY: 45,
        head: [["Metric", "Value"]],
        body: [
          ["Total Revenue", formatPHP(analyticsData?.totalRevenue || 0)],
          ["QR Payments", formatPHP(analyticsData?.qrRevenue || 0)],
          ["Cash Payments", formatPHP(analyticsData?.cashRevenue || 0)],
          ["Total Tickets", String(analyticsData?.totalTrips || 0)],
        ],
        theme: "grid",
        headStyles: { fillColor: [34, 51, 102], textColor: 255 },
        styles: { fontSize: 10, cellPadding: 3, overflow: "linebreak", cellWidth: "wrap" },
      })

      // Revenue Trends (tabular version of the chart)
      const afterSummaryY = (doc as any).lastAutoTable.finalY
      if (analyticsData?.dailyRevenueData?.length) {
        doc.setFontSize(16)
        doc.text("Revenue Trends", 14, afterSummaryY + 15)

        const dailyRows = analyticsData.dailyRevenueData.map((item: any) => [
          format(new Date(item.date), "MM/dd/yyyy"),
          formatPHP(item.amount || 0),
        ])

        autoTable(doc, {
          startY: afterSummaryY + 20,
          head: [["Date", "Revenue"]],
          body: dailyRows,
          theme: "grid",
          headStyles: { fillColor: [34, 51, 102], textColor: 255 },
          styles: { fontSize: 10, cellPadding: 3, overflow: "linebreak", cellWidth: "wrap" },
        })
      }

      // Payment Distribution (QR vs Cash) — mirrors chart + percentages in cards
      const afterTrendsY = (doc as any).lastAutoTable?.finalY || afterSummaryY
      const totalRevenue = Number(analyticsData?.totalRevenue || 0)
      {
        const startY = afterTrendsY > 220 ? (doc.addPage(), 25) : afterTrendsY + 20
        doc.setFontSize(16)
        doc.text("Payment Distribution", 14, startY - 5)

        const qr = Number(analyticsData?.qrRevenue || 0)
        const cash = Number(analyticsData?.cashRevenue || 0)
        const pct = (val: number) => (totalRevenue > 0 ? `${Math.round((val / totalRevenue) * 100)}%` : "0%")

        autoTable(doc, {
          startY,
          head: [["Method", "Amount", "Share"]],
          body: [
            ["QR", formatPHP(qr), pct(qr)],
            ["Cash", formatPHP(cash), pct(cash)],
            [{ content: "Total", styles: { fontStyle: "bold" } }, formatPHP(totalRevenue), "100%"],
          ],
          theme: "grid",
          headStyles: { fillColor: [34, 51, 102], textColor: 255 },
          styles: { fontSize: 10, cellPadding: 3, overflow: "linebreak" },
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

      doc.save(`analytics-report-${format(new Date(), "yyyy-MM-dd")}.pdf`)
    } catch (error) {
      console.error("Error generating PDF:", error)
      alert("Failed to generate PDF. See console for details.")
    } finally {
      setIsExporting(false)
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Analytics</h1>
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

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="w-fit bg-primary text-white">
          <TabsTrigger value="revenue">Revenue</TabsTrigger>
          <TabsTrigger value="payment">Payment Methods</TabsTrigger>
        </TabsList>

        <TabsContent value="revenue" className="space-y-4">
          <Card className="max-w-full">
            <CardHeader>
              <CardTitle>Revenue Trends</CardTitle>
              <CardDescription>
                {dateRange?.from && dateRange?.to ? (
                  <>
                    {format(dateRange.from, "LLL dd, y")} - {format(dateRange.to, "LLL dd, y")}
                  </>
                ) : (
                  "Last 30 days"
                )}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex justify-center items-center mx-auto h-[350px]">
                  <Loader2 className="h-8 w-8 animate-spin text-emerald-400" />
                </div>
              ) : (
                <RevenueChart data={analyticsData?.dailyRevenueData || []} />
              )}
            </CardContent>
          </Card>

          <div className="grid gap-4 grid-cols-1 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Revenue Summary</CardTitle>
                <CardDescription>Key revenue metrics</CardDescription>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="space-y-2">
                    <div className="h-6 animate-pulse rounded-md w-3/4"></div>
                    <div className="h-6 animate-pulse rounded-md w-2/3"></div>
                    <div className="h-6 animate-pulse rounded-md w-4/5"></div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="flex justify-between items-center border-b pb-2">
                      <span className="font-medium">Total Revenue</span>
                      <span className="font-bold text-lg">
                        {formatCurrency(analyticsData?.totalRevenue || 0)}
                      </span>
                    </div>
                    <div className="flex justify-between items-center border-b pb-2">
                      <span className="font-medium">QR Payments</span>
                      <span>{formatCurrency(analyticsData?.qrRevenue || 0)}</span>
                    </div>
                    <div className="flex justify-between items-center border-b pb-2">
                      <span className="font-medium">Cash Payments</span>
                      <span>{formatCurrency(analyticsData?.cashRevenue || 0)}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="font-medium">Total Tickets</span>
                      <span>{analyticsData?.totalTrips || 0}</span>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Payment Distribution</CardTitle>
                <CardDescription>QR vs Cash payments</CardDescription>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="flex justify-center items-center h-[200px]">
                    <Loader2 className="h-8 w-8 animate-spin text-emerald-400" />
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
        </TabsContent>

        <TabsContent value="payment" className="space-y-4">
          <div className="grid gap-4 grid-cols-1 md:grid-cols-2">
            <Card className="col-span-1 md:col-span-2">
              <CardHeader>
                <CardTitle>Payment Methods</CardTitle>
                <CardDescription>Distribution between QR and cash payments</CardDescription>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="flex justify-center items-center h-[350px]">
                    <Loader2 className="h-8 w-8 animate-spin text-emerald-400" />
                  </div>
                ) : (
                  <PaymentMethodChart
                    qrRevenue={analyticsData?.qrRevenue || 0}
                    cashRevenue={analyticsData?.cashRevenue || 0}
                  />
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>QR Payments</CardTitle>
                <CardDescription>Details of QR payment transactions</CardDescription>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="space-y-2">
                    <div className="h-6 bg-muted/20 animate-pulse rounded-md w-3/4"></div>
                    <div className="h-6 bg-muted/20 animate-pulse rounded-md w-2/3"></div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="flex justify-between items-center border-b pb-2">
                      <span className="font-medium">Total Amount</span>
                      <span className="font-bold text-lg">{formatCurrency(analyticsData?.qrRevenue || 0)}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="font-medium">Percentage</span>
                      <span>
                        {analyticsData?.totalRevenue
                          ? Math.round((analyticsData.qrRevenue / analyticsData.totalRevenue) * 100)
                          : 0}
                        %
                      </span>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Cash Payments</CardTitle>
                <CardDescription>Details of cash payment transactions</CardDescription>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="space-y-2">
                    <div className="h-6 bg-muted/20 animate-pulse rounded-md w-3/4"></div>
                    <div className="h-6 bg-muted/20 animate-pulse rounded-md w-2/3"></div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="flex justify-between items-center border-b pb-2">
                      <span className="font-medium">Total Amount</span>
                      <span className="font-bold text-lg">{formatCurrency(analyticsData?.cashRevenue || 0)}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="font-medium">Percentage</span>
                      <span>
                        {analyticsData?.totalRevenue
                          ? Math.round((analyticsData.cashRevenue / analyticsData.totalRevenue) * 100)
                          : 0}
                        %
                      </span>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
