/* eslint-disable @typescript-eslint/no-explicit-any */
"use client"

import { useState, useEffect, useCallback } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { DatePickerWithRange } from "@/components/date-picker-with-range"
import type { DateRange } from "react-day-picker"
import { format, subDays } from "date-fns"
import { Download, ArrowUp, ArrowDown, Bus, Users, Ticket, CreditCard } from "lucide-react"
import { getAnalyticsData, getAllTrips } from "@/lib/trips-service"
import { formatCurrency } from "@/lib/utils"
import { RevenueChart } from "@/components/revenue-chart"
import { PaymentMethodChart } from "@/components/payment-method-chart"
import { Skeleton } from "@/components/ui/skeleton"

export default function DashboardPage() {
  const [isLoading, setIsLoading] = useState(true)
  const [analyticsData, setAnalyticsData] = useState<any>(null)
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: subDays(new Date(), 30),
    to: new Date(),
  })
  const [recentTransactions, setRecentTransactions] = useState<any[]>([])

  const fetchData = useCallback(async () => {
    setIsLoading(true)
    try {
      const data = await getAnalyticsData(dateRange?.from, dateRange?.to)
      setAnalyticsData(data)

      // Also fetch recent transactions for the export
      const trips = await getAllTrips()
      setRecentTransactions(trips.slice(0, 10)) // Get top 10 for export
    } catch (error) {
      console.error("Error fetching analytics data:", error)
    } finally {
      setIsLoading(false)
    }
  }, [dateRange])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  // Function to format currency with peso sign for PDF
  const formatPesoCurrency = (amount: any) => {
    // Ensure amount is a number
    const numAmount = typeof amount === "number" ? amount : Number.parseFloat(amount || 0)
    // Check if it's a valid number
    if (isNaN(numAmount)) return "PHP 0.00"
    // Use "PHP" text instead of the peso symbol to avoid encoding issues
    return `PHP ${numAmount.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ",")}`
  }

  // Function to format percentage change
  const formatPercentageChange = (change: number | undefined) => {
    if (change === undefined) return { value: "0%", isPositive: true }

    const isPositive = change >= 0
    const formattedValue = `${isPositive ? "+" : ""}${change.toFixed(1)}%`

    return { value: formattedValue, isPositive }
  }

  // Function to export dashboard data as PDF
  const handleExport = async () => {
    if (!analyticsData) return

    try {
      // Import jsPDF and jspdf-autotable in a way that ensures proper initialization
      const { jsPDF } = await import("jspdf")
      const autoTable = (await import("jspdf-autotable")).default

      // Create a new PDF document
      const doc = new jsPDF()

      // Set document properties
      const dateFrom = dateRange?.from ? format(dateRange.from, "MMM dd, yyyy") : ""
      const dateTo = dateRange?.to ? format(dateRange.to, "MMM dd, yyyy") : ""

      // Add title and date range
      doc.setFontSize(20)
      doc.text("Dashboard Report", 105, 15, { align: "center" })

      doc.setFontSize(12)
      doc.text(`Date Range: ${dateFrom} to ${dateTo}`, 105, 25, { align: "center" })

      // Add summary metrics section
      doc.setFontSize(16)
      doc.text("Summary Metrics", 14, 40)

      // Create summary metrics table using the imported autoTable function
      autoTable(doc, {
        startY: 45,
        head: [["Metric", "Value"]],
        body: [
          ["Total Revenue", formatPesoCurrency(analyticsData.totalRevenue || 0)],
          ["Tickets Sold", analyticsData.totalTrips || 0],
          ["QR Payments", formatPesoCurrency(analyticsData.qrRevenue || 0)],
          ["Cash Payments", formatPesoCurrency(analyticsData.cashRevenue || 0)],
        ],
        theme: "grid",
        headStyles: { fillColor: [34, 51, 102], textColor: 255 }, // Updated to primary color
        styles: {
          fontSize: 10,
          cellPadding: 3,
          overflow: "linebreak",
          cellWidth: "wrap",
        },
      })

      // Get the Y position after the first table
      const firstTableEndY = (doc as any).lastAutoTable.finalY

      // Add daily revenue section
      if (analyticsData.dailyRevenueData && analyticsData.dailyRevenueData.length > 0) {
        doc.setFontSize(16)
        doc.text("Daily Revenue", 14, firstTableEndY + 15)

        // Create daily revenue table
        const dailyRevenueData = analyticsData.dailyRevenueData.map((item: any) => [
          format(new Date(item.date), "MM/dd/yyyy"),
          formatPesoCurrency(item.amount || 0),
        ])

        autoTable(doc, {
          startY: firstTableEndY + 20,
          head: [["Date", "Revenue"]],
          body: dailyRevenueData,
          theme: "grid",
          headStyles: { fillColor: [34, 51, 102], textColor: 255 }, // Updated to primary color
          styles: {
            fontSize: 10,
            cellPadding: 3,
            overflow: "linebreak",
            cellWidth: "wrap",
          },
        })
      }

      // Get the Y position after the second table
      const secondTableEndY = (doc as any).lastAutoTable.finalY

      // Add top routes section - MODIFIED FOR VERTICAL LAYOUT
      if (analyticsData.topRoutes && analyticsData.topRoutes.length > 0) {
        // Check if we need a new page
        if (secondTableEndY > 220) {
          doc.addPage()
          doc.setFontSize(16)
          doc.text("Top Routes", 14, 20)
        } else {
          doc.setFontSize(16)
          doc.text("Top Routes", 14, secondTableEndY + 15)
        }

        // Create top routes table with vertical orientation and smaller font for route names
        // Make sure to replace any "p" with "to" in route names and use even smaller font
        const topRoutesData = analyticsData.topRoutes.map((route: any) => {
          // Ensure route name has correct "to" instead of "p"
          const routeName = typeof route.route === "string" ? route.route.replace(/\bp\b/g, "to") : route.route

          return [
            { content: routeName, styles: { cellWidth: "auto", halign: "left", fontSize: 7 } }, // Even smaller font (7pt)
            { content: route.count, styles: { cellWidth: 30, halign: "center" } },
          ]
        })

        autoTable(doc, {
          startY: secondTableEndY > 220 ? 25 : secondTableEndY + 20,
          head: [
            [
              { content: "Route", styles: { halign: "left" } },
              { content: "Tickets", styles: { halign: "center" } },
            ],
          ],
          body: topRoutesData,
          theme: "grid",
          headStyles: { fillColor: [34, 51, 102], textColor: 255 }, // Updated to primary color
          styles: {
            fontSize: 10, // Default font size for other cells
            cellPadding: 3,
            overflow: "linebreak",
          },
          columnStyles: {
            0: { cellWidth: "auto" }, // Route column takes most of the space
            1: { cellWidth: 30 }, // Tickets column is fixed width
          },
          margin: { left: 14, right: 14 },
        })
      }

      // Get the Y position after the third table
      const thirdTableEndY = (doc as any).lastAutoTable.finalY

      // Add recent transactions section
      if (recentTransactions && recentTransactions.length > 0) {
        // Check if we need a new page
        if (thirdTableEndY > 180) {
          doc.addPage()
          doc.setFontSize(16)
          doc.text("Recent Transactions", 14, 20)
        } else {
          doc.setFontSize(16)
          doc.text("Recent Transactions", 14, thirdTableEndY + 15)
        }

        // Create recent transactions table
        // Ensure fare values are properly converted to numbers
        const transactionsData = recentTransactions.map((transaction: any) => {
          // Make sure fare is properly converted to a number
          const fareValue =
            typeof transaction.fare === "string"
              ? Number.parseFloat(transaction.fare.replace(/[^\d.-]/g, ""))
              : transaction.fare

          return [
            format(new Date(transaction.timestamp), "MM/dd/yyyy"),
            transaction.passengerName,
            `${transaction.from} to ${transaction.to}`.replace(/\bp\b/g, "to"), // Fix any "p" to "to" here as well
            transaction.paymentMethod,
            formatPesoCurrency(fareValue), // Use the properly converted fare value
          ]
        })

        autoTable(doc, {
          startY: thirdTableEndY > 180 ? 25 : thirdTableEndY + 20,
          head: [["Date", "Passenger", "Route", "Payment", "Fare"]],
          body: transactionsData,
          theme: "grid",
          headStyles: { fillColor: [34, 51, 102], textColor: 255 }, // Updated to primary color
          styles: {
            fontSize: 9,
            cellPadding: 3,
            overflow: "linebreak",
            cellWidth: "wrap",
          },
          columnStyles: {
            0: { cellWidth: 25 },
            1: { cellWidth: 35 },
            2: { cellWidth: 70 },
            3: { cellWidth: 25 },
            4: { cellWidth: 25 },
          },
        })
      }

      // Add footer with generation date
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

      // Save the PDF
      doc.save(`dashboard-report-${format(new Date(), "yyyy-MM-dd")}.pdf`)
    } catch (error) {
      console.error("Error generating PDF:", error)
      alert("Failed to generate PDF. See console for details.")
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
            disabled={isLoading || !analyticsData}
          >
            <Download className="mr-2 h-4 w-4" />
            <span>Export PDF</span>
          </Button>
        </div>
      </div>

      <div className="space-y-4">
        {/* Stats Cards */}
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
          {isLoading ? (
            // Skeleton loaders for stats cards with consistent sizing
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
                  <div className="text-2xl font-bold">
                    {analyticsData?.totalTrips || 0}
                  </div>
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
                  "Last 30 days"
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

