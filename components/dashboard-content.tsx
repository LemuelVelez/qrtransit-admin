"use client"

import type React from "react"
import { ArrowDown, ArrowUp, Bus, Calendar, DollarSign, Download, Search, Ticket, Users } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"

export function DashboardContent() {
    return (
        <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
                <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
                <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm">
                        <Calendar className="mr-2 h-4 w-4" />
                        <span>Mar 1 - Mar 31, 2025</span>
                    </Button>
                    <Button variant="outline" size="sm">
                        <Download className="mr-2 h-4 w-4" />
                        <span>Download</span>
                    </Button>
                </div>
            </div>

            <Tabs defaultValue="overview" className="space-y-4">
                <TabsList>
                    <TabsTrigger value="overview">Overview</TabsTrigger>
                    <TabsTrigger value="analytics">Analytics</TabsTrigger>
                    <TabsTrigger value="reports">Reports</TabsTrigger>
                </TabsList>
                <TabsContent value="overview" className="space-y-4">
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                        <MetricCard
                            title="Total Revenue"
                            value="$45,231.89"
                            description="+20.1% from last month"
                            icon={<DollarSign className="h-4 w-4 text-emerald-500" />}
                            trend="up"
                        />
                        <MetricCard
                            title="Tickets Sold"
                            value="2,350"
                            description="+15% from last month"
                            icon={<Ticket className="h-4 w-4 text-emerald-500" />}
                            trend="up"
                        />
                        <MetricCard
                            title="Active Users"
                            value="1,893"
                            description="+7.2% from last month"
                            icon={<Users className="h-4 w-4 text-emerald-500" />}
                            trend="up"
                        />
                        <MetricCard
                            title="Active Buses"
                            value="42"
                            description="Same as last month"
                            icon={<Bus className="h-4 w-4 text-emerald-500" />}
                            trend="neutral"
                        />
                    </div>

                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
                        <Card className="col-span-4">
                            <CardHeader>
                                <CardTitle>Recent Ticket Sales</CardTitle>
                                <CardDescription>You sold 2,350 tickets this month.</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <RecentTicketsTable />
                            </CardContent>
                        </Card>
                        <Card className="col-span-3">
                            <CardHeader>
                                <CardTitle>Popular Routes</CardTitle>
                                <CardDescription>Top performing routes this month.</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <PopularRoutes />
                            </CardContent>
                        </Card>
                    </div>
                </TabsContent>
                <TabsContent value="analytics" className="space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>Analytics</CardTitle>
                            <CardDescription>View detailed analytics for your bus ticketing system.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="h-[400px] flex items-center justify-center border border-dashed rounded-lg">
                                <p className="text-muted-foreground">Analytics charts will appear here</p>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>
                <TabsContent value="reports" className="space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>Reports</CardTitle>
                            <CardDescription>Generate and download reports for your bus ticketing system.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="h-[400px] flex items-center justify-center border border-dashed rounded-lg">
                                <p className="text-muted-foreground">Reports will appear here</p>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    )
}

function MetricCard({
    title,
    value,
    description,
    icon,
    trend,
}: {
    title: string
    value: string
    description: string
    icon: React.ReactNode
    trend: "up" | "down" | "neutral"
}) {
    return (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{title}</CardTitle>
                <div className="h-4 w-4 text-muted-foreground">{icon}</div>
            </CardHeader>
            <CardContent>
                <div className="text-2xl font-bold">{value}</div>
                <p className="text-xs text-muted-foreground flex items-center mt-1">
                    {trend === "up" && <ArrowUp className="mr-1 h-3 w-3 text-emerald-500" />}
                    {trend === "down" && <ArrowDown className="mr-1 h-3 w-3 text-red-500" />}
                    {description}
                </p>
            </CardContent>
        </Card>
    )
}

function RecentTicketsTable() {
    const tickets = [
        {
            id: "T-1234",
            customer: "John Doe",
            route: "Downtown - Airport",
            date: "2025-03-19",
            amount: "$12.99",
            status: "Completed",
        },
        {
            id: "T-1235",
            customer: "Jane Smith",
            route: "Central - Westside",
            date: "2025-03-19",
            amount: "$8.50",
            status: "Completed",
        },
        {
            id: "T-1236",
            customer: "Robert Johnson",
            route: "Northside - Downtown",
            date: "2025-03-18",
            amount: "$10.75",
            status: "Completed",
        },
        {
            id: "T-1237",
            customer: "Emily Davis",
            route: "Airport - Eastside",
            date: "2025-03-18",
            amount: "$15.25",
            status: "Refunded",
        },
        {
            id: "T-1238",
            customer: "Michael Wilson",
            route: "Westside - Central",
            date: "2025-03-17",
            amount: "$8.50",
            status: "Completed",
        },
    ]

    return (
        <div>
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                    <div className="relative max-w-sm">
                        <Search className="absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        <Input placeholder="Search tickets..." className="pl-8" />
                    </div>
                </div>
                <Select defaultValue="all">
                    <SelectTrigger className="w-[180px]">
                        <SelectValue placeholder="Filter by status" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All Statuses</SelectItem>
                        <SelectItem value="completed">Completed</SelectItem>
                        <SelectItem value="refunded">Refunded</SelectItem>
                        <SelectItem value="cancelled">Cancelled</SelectItem>
                    </SelectContent>
                </Select>
            </div>
            <div className="rounded-md border">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Ticket ID</TableHead>
                            <TableHead>Customer</TableHead>
                            <TableHead>Route</TableHead>
                            <TableHead>Date</TableHead>
                            <TableHead>Amount</TableHead>
                            <TableHead>Status</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {tickets.map((ticket) => (
                            <TableRow key={ticket.id}>
                                <TableCell className="font-medium">{ticket.id}</TableCell>
                                <TableCell>{ticket.customer}</TableCell>
                                <TableCell>{ticket.route}</TableCell>
                                <TableCell>{ticket.date}</TableCell>
                                <TableCell>{ticket.amount}</TableCell>
                                <TableCell>
                                    <Badge
                                        variant={ticket.status === "Completed" ? "default" : "destructive"}
                                        className={ticket.status === "Completed" ? "bg-emerald-500 hover:bg-emerald-600" : ""}
                                    >
                                        {ticket.status}
                                    </Badge>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </div>
        </div>
    )
}

function PopularRoutes() {
    const routes = [
        {
            name: "Downtown - Airport",
            tickets: 532,
            revenue: "$6,915.68",
            growth: "+12%",
        },
        {
            name: "Central - Westside",
            tickets: 498,
            revenue: "$4,233.00",
            growth: "+8%",
        },
        {
            name: "Northside - Downtown",
            tickets: 456,
            revenue: "$4,902.00",
            growth: "+5%",
        },
        {
            name: "Airport - Eastside",
            tickets: 387,
            revenue: "$5,902.75",
            growth: "+15%",
        },
        {
            name: "Westside - Central",
            tickets: 354,
            revenue: "$3,009.00",
            growth: "+3%",
        },
    ]

    return (
        <div className="space-y-4">
            {routes.map((route, index) => (
                <div key={index} className="flex items-center justify-between border-b pb-3 last:border-0 last:pb-0">
                    <div>
                        <p className="font-medium">{route.name}</p>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1">
                            <span className="flex items-center">
                                <Ticket className="mr-1 h-3 w-3" />
                                {route.tickets} tickets
                            </span>
                            <span className="flex items-center">
                                <DollarSign className="mr-1 h-3 w-3" />
                                {route.revenue}
                            </span>
                        </div>
                    </div>
                    <Badge variant="outline" className="text-emerald-500 border-emerald-500">
                        {route.growth}
                    </Badge>
                </div>
            ))}
        </div>
    )
}

