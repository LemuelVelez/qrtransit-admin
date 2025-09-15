// app/dashboard/analytics/page.tsx
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
import { getAnalyticsData, getAllTrips } from "@/lib/trips-service"
import { formatCurrency } from "@/lib/utils"
import { RevenueChart } from "@/components/revenue-chart"
import { PaymentMethodChart } from "@/components/payment-method-chart"

export default function AnalyticsPage() {
  const [isLoading, setIsLoading] = useState(true)
  const [isExporting, setIsExporting] = useState(false)
  const [analyticsData, setAnalyticsData] = useState<any>(null)
  const [recentTransactions, setRecentTransactions] = useState<any[]>([])
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

      // also fetch some recent transactions for the export
      const trips = await getAllTrips()
      setRecentTransactions(trips.slice(0, 10))
    } catch (error) {
      console.error("Error fetching analytics data:", error)
    } finally {
      setIsLoading(false)
    }
  }, [dateRange])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  // Peso currency formatter used in the PDF (kept local to avoid importing utils into the PDF context)
  const formatPesoCurrency = (amount: any) => {
    const numAmount = typeof amount === "number" ? amount : Number.parseFloat(amount || 0)
    if (isNaN(numAmount)) return "PHP 0.00"
    return `PHP ${numAmount.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ",")}`
  }

  // Export PDF (mirrors dashboard/page.tsx with Analytics-focused titling)
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

      // Summary Metrics
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
        styles: {
          fontSize: 10,
          cellPadding: 3,
          overflow: "linebreak",
          cellWidth: "wrap",
        },
      })

      // Daily Revenue
      const afterSummaryY = (doc as any).lastAutoTable.finalY
      if (analyticsData?.dailyRevenueData?.length) {
        doc.setFontSize(16)
        doc.text("Daily Revenue", 14, afterSummaryY + 15)

        const dailyRows = analyticsData.dailyRevenueData.map((item: any) => [
          format(new Date(item.date), "MM/dd/yyyy"),
          formatPesoCurrency(item.amount || 0),
        ])

        autoTable(doc, {
          startY: afterSummaryY + 20,
          head: [["Date", "Revenue"]],
          body: dailyRows,
          theme: "grid",
          headStyles: { fillColor: [34, 51, 102], textColor: 255 },
          styles: {
            fontSize: 10,
            cellPadding: 3,
            overflow: "linebreak",
            cellWidth: "wrap",
          },
        })
      }

      // Top Routes
      const afterDailyY = (doc as any).lastAutoTable?.finalY || afterSummaryY
      if (analyticsData?.topRoutes?.length) {
        if (afterDailyY > 220) {
          doc.addPage()
          doc.setFontSize(16)
          doc.text("Top Routes", 14, 20)
        } else {
          doc.setFontSize(16)
          doc.text("Top Routes", 14, afterDailyY + 15)
        }

        const topRoutesRows = analyticsData.topRoutes.map((route: any) => {
          const routeName =
            typeof route.route === "string" ? route.route.replace(/\bp\b/g, "to") : route.route
          return [
            { content: routeName, styles: { cellWidth: "auto", halign: "left", fontSize: 7 } },
            { content: route.count, styles: { cellWidth: 30, halign: "center" } },
          ]
        })

        autoTable(doc, {
          startY: afterDailyY > 220 ? 25 : afterDailyY + 20,
          head: [
            [
              { content: "Route", styles: { halign: "left" } },
              { content: "Tickets", styles: { halign: "center" } },
            ],
          ],
          body: topRoutesRows,
          theme: "grid",
          headStyles: { fillColor: [34, 51, 102], textColor: 255 },
          styles: { fontSize: 10, cellPadding: 3, overflow: "linebreak" },
          columnStyles: { 0: { cellWidth: "auto" }, 1: { cellWidth: 30 } },
          margin: { left: 14, right: 14 },
        })
      }

      // Recent Transactions
      const afterRoutesY = (doc as any).lastAutoTable?.finalY || afterDailyY
      if (recentTransactions?.length) {
        if (afterRoutesY > 180) {
          doc.addPage()
          doc.setFontSize(16)
          doc.text("Recent Transactions", 14, 20)
        } else {
          doc.setFontSize(16)
          doc.text("Recent Transactions", 14, afterRoutesY + 15)
        }

        const txRows = recentTransactions.map((tx: any) => {
          const fareValue =
            typeof tx.fare === "string" ? Number.parseFloat(tx.fare.replace(/[^\d.-]/g, "")) : tx.fare
          return [
            format(new Date(tx.timestamp), "MM/dd/yyyy"),
            tx.passengerName,
            `${tx.from} to ${tx.to}`.replace(/\bp\b/g, "to"),
            tx.paymentMethod,
            formatPesoCurrency(fareValue),
          ]
        })

        autoTable(doc, {
          startY: afterRoutesY > 180 ? 25 : afterRoutesY + 20,
          head: [["Date", "Passenger", "Route", "Payment", "Fare"]],
          body: txRows,
          theme: "grid",
          headStyles: { fillColor: [34, 51, 102], textColor: 255 },
          styles: { fontSize: 9, cellPadding: 3, overflow: "linebreak", cellWidth: "wrap" },
          columnStyles: {
            0: { cellWidth: 25 },
            1: { cellWidth: 35 },
            2: { cellWidth: 70 },
            3: { cellWidth: 25 },
            4: { cellWidth: 25 },
          },
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
                      <span className="font-bold text-lg">{formatCurrency(analyticsData?.totalRevenue || 0)}</span>
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
