/* eslint-disable @typescript-eslint/no-explicit-any */
"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { DatePickerWithRange } from "@/components/date-picker-with-range"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area"
import { Search, Loader2, Bus, QrCode, Banknote, CheckCircle, XCircle, Filter } from "lucide-react"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { subDays } from "date-fns"
import type { DateRange } from "react-day-picker"
import { formatCurrency } from "@/lib/utils"
import { getBusesWithConductors, updateCashRemittanceStatus } from "@/lib/bus-management-service"

export default function BusManagementPage() {
    const [isLoading, setIsLoading] = useState(true)
    const [buses, setBuses] = useState<any[]>([])
    const [filteredBuses, setFilteredBuses] = useState<any[]>([])
    const [searchQuery, setSearchQuery] = useState("")
    const [dateRange, setDateRange] = useState<DateRange | undefined>({
        from: subDays(new Date(), 0), // Today
        to: new Date(),
    })
    const [activeTab, setActiveTab] = useState("all")
    const [selectedBus, setSelectedBus] = useState<any>(null)
    const [isUpdating, setIsUpdating] = useState(false)
    const [showRemittanceDialog, setShowRemittanceDialog] = useState(false)
    const [remittanceAmount, setRemittanceAmount] = useState("")
    const [remittanceNotes, setRemittanceNotes] = useState("")

    // Fetch buses data
    const fetchBuses = async () => {
        setIsLoading(true)
        try {
            const busesData = await getBusesWithConductors(dateRange?.from, dateRange?.to)
            setBuses(busesData)
            filterBuses(busesData, activeTab, searchQuery)
        } catch (error) {
            console.error("Error fetching buses:", error)
        } finally {
            setIsLoading(false)
        }
    }

    // Filter buses based on tab and search query
    const filterBuses = (busesData: any[], tab: string, query: string) => {
        let filtered = [...busesData]

        // Filter by tab
        if (tab === "remitted") {
            filtered = filtered.filter((bus) => bus.cashRemitted)
        } else if (tab === "pending") {
            filtered = filtered.filter((bus) => !bus.cashRemitted && bus.cashRevenue > 0)
        }

        // Filter by search query
        if (query.trim() !== "") {
            const lowercaseQuery = query.toLowerCase()
            filtered = filtered.filter(
                (bus) =>
                    bus.busNumber.toLowerCase().includes(lowercaseQuery) ||
                    bus.conductorName.toLowerCase().includes(lowercaseQuery) ||
                    bus.route.toLowerCase().includes(lowercaseQuery),
            )
        }

        setFilteredBuses(filtered)
    }

    // Effect for fetching data when date range changes
    useEffect(() => {
        fetchBuses()
    }, [dateRange]) // eslint-disable-line react-hooks/exhaustive-deps

    // Effect for filtering when tab or search query changes
    useEffect(() => {
        filterBuses(buses, activeTab, searchQuery)
    }, [activeTab, searchQuery, buses])

    // Handle cash remittance status update
    const handleRemittanceStatusUpdate = async (bus: any, remitted: boolean) => {
        if (remitted) {
            // If marking as remitted, show dialog to enter amount
            setSelectedBus(bus)
            setRemittanceAmount(bus.cashRevenue.toString())
            setRemittanceNotes("")
            setShowRemittanceDialog(true)
        } else {
            // If marking as not remitted, update directly
            await updateRemittanceStatus(bus.id, false, 0, "")
        }
    }

    // Update remittance status
    const updateRemittanceStatus = async (busId: string, remitted: boolean, amount: number, notes: string) => {
        setIsUpdating(true)
        try {
            await updateCashRemittanceStatus(busId, remitted, amount, notes)

            // Update local state
            const updatedBuses = buses.map((bus) =>
                bus.id === busId
                    ? {
                        ...bus,
                        cashRemitted: remitted,
                        remittanceAmount: remitted ? amount : 0,
                        remittanceNotes: remitted ? notes : "",
                    }
                    : bus,
            )

            setBuses(updatedBuses)
            setShowRemittanceDialog(false)
        } catch (error) {
            console.error("Error updating remittance status:", error)
        } finally {
            setIsUpdating(false)
        }
    }

    // Handle confirm remittance from dialog
    const handleConfirmRemittance = async () => {
        if (!selectedBus) return

        const amount = Number.parseFloat(remittanceAmount)
        if (isNaN(amount)) {
            alert("Please enter a valid amount")
            return
        }

        await updateRemittanceStatus(selectedBus.id, true, amount, remittanceNotes)
    }

    return (
        <div className="flex flex-col gap-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Bus Management</h1>
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 w-full sm:w-auto">
                    <DatePickerWithRange date={dateRange} onDateChange={setDateRange} />
                    <Button variant="outline" size="sm" onClick={fetchBuses} className="w-full sm:w-auto" disabled={isLoading}>
                        {isLoading ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Loading...
                            </>
                        ) : (
                            <>
                                <Filter className="mr-2 h-4 w-4" />
                                Apply Filter
                            </>
                        )}
                    </Button>
                </div>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Bus Revenue & Cash Remittance</CardTitle>
                    <CardDescription>View revenue by bus and track cash remittance status</CardDescription>
                </CardHeader>
                <CardContent>
                    <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
                        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                            <TabsList className="bg-primary text-white">
                                <TabsTrigger value="all">All Buses</TabsTrigger>
                                <TabsTrigger value="pending">Pending Remittance</TabsTrigger>
                                <TabsTrigger value="remitted">Cash Remitted</TabsTrigger>
                            </TabsList>

                            <div className="relative w-full sm:w-auto">
                                <Search className="absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                                <Input
                                    placeholder="Search buses or conductors..."
                                    className="pl-8 w-full sm:w-[300px]"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                />
                            </div>
                        </div>

                        <TabsContent value="all" className="space-y-4">
                            {renderBusesTable()}
                        </TabsContent>

                        <TabsContent value="pending" className="space-y-4">
                            {renderBusesTable()}
                        </TabsContent>

                        <TabsContent value="remitted" className="space-y-4">
                            {renderBusesTable()}
                        </TabsContent>
                    </Tabs>
                </CardContent>
            </Card>

            {/* Remittance Dialog */}
            <Dialog open={showRemittanceDialog} onOpenChange={setShowRemittanceDialog}>
                <DialogContent className="sm:max-w-[425px] bg-primary text-white">
                    <DialogHeader>
                        <DialogTitle>Confirm Cash Remittance</DialogTitle>
                        <DialogDescription>
                            Record cash remittance for Bus {selectedBus?.busNumber} operated by {selectedBus?.conductorName}
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="remittance-amount" className="text-right">
                                Amount
                            </Label>
                            <div className="col-span-3">
                                <Input
                                    id="remittance-amount"
                                    type="number"
                                    step="0.01"
                                    value={remittanceAmount}
                                    onChange={(e) => setRemittanceAmount(e.target.value)}
                                    className="w-full"
                                />
                            </div>
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="remittance-notes" className="text-right">
                                Notes
                            </Label>
                            <div className="col-span-3">
                                <Input
                                    id="remittance-notes"
                                    value={remittanceNotes}
                                    onChange={(e) => setRemittanceNotes(e.target.value)}
                                    className="w-full"
                                    placeholder="Optional notes"
                                />
                            </div>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowRemittanceDialog(false)}>
                            Cancel
                        </Button>
                        <Button onClick={handleConfirmRemittance} disabled={isUpdating}>
                            {isUpdating ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Updating...
                                </>
                            ) : (
                                "Confirm Remittance"
                            )}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )

    function renderBusesTable() {
        if (isLoading) {
            return (
                <div className="flex justify-center items-center py-8">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
            )
        }

        if (filteredBuses.length === 0) {
            return (
                <div className="rounded-md border p-8 text-center">
                    <div className="flex flex-col items-center justify-center gap-2">
                        <Bus className="h-8 w-8 text-muted-foreground" />
                        <h3 className="text-lg font-medium">No buses found</h3>
                        <p className="text-sm text-muted-foreground">
                            {searchQuery
                                ? "Try adjusting your search query"
                                : activeTab === "pending"
                                    ? "There are no buses with pending cash remittance"
                                    : activeTab === "remitted"
                                        ? "There are no buses with completed cash remittance"
                                        : "No buses are operating for the selected date range"}
                        </p>
                    </div>
                </div>
            )
        }

        return (
            <div className="rounded-md border overflow-hidden">
                <ScrollArea className="whitespace-nowrap rounded-md border mx-auto">
                    <Table>
                        <TableHeader className="sticky top-0 z-10 bg-primary text-white">
                            <TableRow className="hover:primary/30">
                                <TableHead className="w-[120px]">Bus Number</TableHead>
                                <TableHead className="w-[200px]">Conductor</TableHead>
                                <TableHead className="w-[200px]">Route</TableHead>
                                <TableHead className="w-[120px]">QR Revenue</TableHead>
                                <TableHead className="w-[120px]">Cash Revenue</TableHead>
                                <TableHead className="w-[120px]">Total Revenue</TableHead>
                                <TableHead className="w-[150px]">Remittance Status</TableHead>
                                <TableHead className="w-[100px] text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filteredBuses.map((bus) => (
                                <TableRow key={bus.id}>
                                    <TableCell className="font-medium">{bus.busNumber}</TableCell>
                                    <TableCell>{bus.conductorName}</TableCell>
                                    <TableCell>{bus.route}</TableCell>
                                    <TableCell>
                                        <div className="flex items-center">
                                            <QrCode className="mr-2 h-4 w-4 text-primary" />
                                            {formatCurrency(bus.qrRevenue)}
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex items-center">
                                            <Banknote className="mr-2 h-4 w-4 text-primary" />
                                            {formatCurrency(bus.cashRevenue)}
                                        </div>
                                    </TableCell>
                                    <TableCell className="font-semibold">{formatCurrency(bus.totalRevenue)}</TableCell>
                                    <TableCell>
                                        {bus.cashRevenue > 0 ? (
                                            bus.cashRemitted ? (
                                                <Badge className="text-white">
                                                    <CheckCircle className="mr-1 h-3 w-3" />
                                                    Remitted
                                                </Badge>
                                            ) : (
                                                <Badge variant="accent" className="text-white">
                                                    <XCircle className="mr-1 h-3 w-3" />
                                                    Pending
                                                </Badge>
                                            )
                                        ) : (
                                            <Badge variant="outline" className="text-white">
                                                No Cash
                                            </Badge>
                                        )}
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button size="sm" className="text-white hover:primary/30">
                                                    Actions
                                                </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end">
                                                {bus.cashRevenue > 0 && !bus.cashRemitted && (
                                                    <DropdownMenuItem
                                                        onClick={() => handleRemittanceStatusUpdate(bus, true)}
                                                        className="bg-primary text-white mb-2"
                                                    >
                                                        <CheckCircle className="mr-2 h-4 w-4" />
                                                        Mark as Remitted
                                                    </DropdownMenuItem>
                                                )}
                                                <DropdownMenuItem
                                                    onClick={() => handleRemittanceStatusUpdate(bus, false)}
                                                    className="bg-red-700 text-white"
                                                >
                                                    <XCircle className="mr-2 h-4 w-4" />
                                                    Mark as Not Remitted
                                                </DropdownMenuItem>
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                    <ScrollBar orientation="horizontal" />
                </ScrollArea>
            </div>
        )
    }
}

