"use client"

import { useState, useEffect } from "react"
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
import { TopRoutesTable } from "@/components/top-routes-table"

export default function AnalyticsPage() {
  const [isLoading, setIsLoading] = useState(true)
  const [analyticsData, setAnalyticsData] = useState<any>(null)
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: subDays(new Date(), 30),
    to: new Date(),
  })

  useEffect(() => {
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

    fetchData()
  }, [dateRange])

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Analytics</h1>
        <div className="flex items-center gap-2">
          <DatePickerWithRange date={dateRange} onDateChange={setDateRange} />
          <Button variant="outline" size="sm">
            <Download className="mr-2 h-4 w-4" />
            <span>Export</span>
          </Button>
        </div>
      </div>

      <Tabs defaultValue="revenue" className="space-y-4">
        <TabsList>
          <TabsTrigger value="revenue">Revenue</TabsTrigger>
          <TabsTrigger value="routes">Routes</TabsTrigger>
          <TabsTrigger value="payment">Payment Methods</TabsTrigger>
        </TabsList>

        <TabsContent value="revenue" className="space-y-4">
          <Card>
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
                <div className="flex justify-center items-center h-[350px]">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : (
                <RevenueChart data={analyticsData?.dailyRevenueData || []} />
              )}
            </CardContent>
          </Card>

          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Revenue Summary</CardTitle>
                <CardDescription>Key revenue metrics</CardDescription>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="space-y-2">
                    <div className="h-6 bg-muted/20 animate-pulse rounded-md w-3/4"></div>
                    <div className="h-6 bg-muted/20 animate-pulse rounded-md w-2/3"></div>
                    <div className="h-6 bg-muted/20 animate-pulse rounded-md w-4/5"></div>
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
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
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

        <TabsContent value="routes" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Top Routes</CardTitle>
              <CardDescription>Most popular routes by ticket sales</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex justify-center items-center h-[300px]">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : (
                <TopRoutesTable routes={analyticsData?.topRoutes || []} />
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Top Buses</CardTitle>
              <CardDescription>Most active buses by ticket sales</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex justify-center items-center h-[300px]">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : (
                <div className="rounded-md border">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b bg-muted/50">
                        <th className="h-10 px-4 text-left align-middle font-medium text-muted-foreground">
                          Bus Number
                        </th>
                        <th className="h-10 px-4 text-right align-middle font-medium text-muted-foreground">Tickets</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(analyticsData?.topBuses || []).length === 0 ? (
                        <tr>
                          <td colSpan={2} className="text-center py-6 text-muted-foreground">
                            No bus data available
                          </td>
                        </tr>
                      ) : (
                        (analyticsData?.topBuses || []).map((bus: any, index: number) => (
                          <tr key={index} className="border-b">
                            <td className="p-4 align-middle">{bus.busNumber}</td>
                            <td className="p-4 align-middle text-right">
                              <span className="inline-flex items-center rounded-md border px-2.5 py-0.5 text-xs font-semibold">
                                {bus.count}
                              </span>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="payment" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card className="md:col-span-2">
              <CardHeader>
                <CardTitle>Payment Methods</CardTitle>
                <CardDescription>Distribution between QR and cash payments</CardDescription>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="flex justify-center items-center h-[350px]">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
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

