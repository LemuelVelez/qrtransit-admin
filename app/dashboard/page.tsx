/* eslint-disable @typescript-eslint/no-explicit-any */
"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { DatePickerWithRange } from "@/components/date-picker-with-range"
import type { DateRange } from "react-day-picker"
import { format, subDays } from "date-fns"
import { Download, ArrowUp, ArrowDown, Bus, Users, Ticket, CreditCard } from "lucide-react"
import { getAnalyticsData } from "@/lib/trips-service"
import { formatCurrency } from "@/lib/utils"
import { RevenueChart } from "@/components/revenue-chart"
import { PaymentMethodChart } from "@/components/payment-method-chart"
import { TopRoutesTable } from "@/components/top-routes-table"
import { RecentTransactionsTable } from "@/components/recent-transactions-table"

export default function DashboardPage() {
  const [isLoading, setIsLoading] = useState(true)
  const [analyticsData, setAnalyticsData] = useState<any>(null)
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: subDays(new Date(), 30),
    to: new Date(),
  })
  const [activeTab, setActiveTab] = useState("overview")

  const fetchData = async () => {
    setIsLoading(true)
    try {
      const data = await getAnalyticsData(dateRange?.from, dateRange?.to)
      setAnalyticsData(data)
    } catch (error) {
      console.error("Error fetching analytics data:", error)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [dateRange]) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Dashboard</h1>
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 w-full sm:w-auto">
          <DatePickerWithRange date={dateRange} onDateChange={setDateRange} />
          <Button variant="outline" size="sm" className="w-full sm:w-auto">
            <Download className="mr-2 h-4 w-4" />
            <span>Export</span>
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="w-full sm:w-auto">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
          <TabsTrigger value="reports">Reports</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          {isLoading ? (
            <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
              {[...Array(4)].map((_, i) => (
                <Card key={i} className="animate-pulse">
                  <CardHeader className="space-y-0 pb-2">
                    <div className="h-5 w-20 bg-muted rounded"></div>
                  </CardHeader>
                  <CardContent>
                    <div className="h-7 w-24 bg-muted rounded mb-1"></div>
                    <div className="h-4 w-32 bg-muted rounded"></div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
                  <CreditCard className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{formatCurrency(analyticsData?.totalRevenue || 0)}</div>
                  <p className="text-xs text-muted-foreground flex items-center mt-1">
                    <ArrowUp className="mr-1 h-3 w-3 text-emerald-500" />
                    +20.1% from previous period
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Tickets Sold</CardTitle>
                  <Ticket className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{analyticsData?.totalTrips || 0}</div>
                  <p className="text-xs text-muted-foreground flex items-center mt-1">
                    <ArrowUp className="mr-1 h-3 w-3 text-emerald-500" />
                    +15% from previous period
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">QR Payments</CardTitle>
                  <Users className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{formatCurrency(analyticsData?.qrRevenue || 0)}</div>
                  <p className="text-xs text-muted-foreground flex items-center mt-1">
                    <ArrowUp className="mr-1 h-3 w-3 text-emerald-500" />
                    +7.2% from previous period
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Cash Payments</CardTitle>
                  <Bus className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{formatCurrency(analyticsData?.cashRevenue || 0)}</div>
                  <p className="text-xs text-muted-foreground flex items-center mt-1">
                    <ArrowDown className="mr-1 h-3 w-3 text-red-500" />
                    -3% from previous period
                  </p>
                </CardContent>
              </Card>
            </div>
          )}

          <div className="grid gap-4 grid-cols-1 lg:grid-cols-7">
            <Card className="col-span-full lg:col-span-4">
              <CardHeader>
                <CardTitle>Revenue Overview</CardTitle>
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
                  <div className="h-[300px] bg-muted/20 animate-pulse rounded-md"></div>
                ) : (
                  <RevenueChart data={analyticsData?.dailyRevenueData || []} />
                )}
              </CardContent>
            </Card>

            <Card className="col-span-full lg:col-span-3">
              <CardHeader>
                <CardTitle>Payment Methods</CardTitle>
                <CardDescription>Distribution between QR and cash payments</CardDescription>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="h-[300px] bg-muted/20 animate-pulse rounded-md"></div>
                ) : (
                  <PaymentMethodChart
                    qrRevenue={analyticsData?.qrRevenue || 0}
                    cashRevenue={analyticsData?.cashRevenue || 0}
                  />
                )}
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-4 grid-cols-1 lg:grid-cols-7">
            <Card className="col-span-full lg:col-span-4">
              <CardHeader>
                <CardTitle>Recent Transactions</CardTitle>
                <CardDescription>Latest ticket sales across all routes</CardDescription>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="h-[300px] bg-muted/20 animate-pulse rounded-md"></div>
                ) : (
                  <RecentTransactionsTable />
                )}
              </CardContent>
            </Card>

            <Card className="col-span-full lg:col-span-3">
              <CardHeader>
                <CardTitle>Top Routes</CardTitle>
                <CardDescription>Most popular routes by ticket sales</CardDescription>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="h-[300px] bg-muted/20 animate-pulse rounded-md"></div>
                ) : (
                  <TopRoutesTable routes={analyticsData?.topRoutes || []} />
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Detailed Analytics</CardTitle>
              <CardDescription>In-depth analysis of your bus ticketing system</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[400px] flex items-center justify-center border border-dashed rounded-lg">
                <p className="text-muted-foreground">Detailed analytics coming soon</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="reports" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Reports</CardTitle>
              <CardDescription>Generate and download reports for your bus ticketing system</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[400px] flex items-center justify-center border border-dashed rounded-lg">
                <p className="text-muted-foreground">Report generation coming soon</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}

