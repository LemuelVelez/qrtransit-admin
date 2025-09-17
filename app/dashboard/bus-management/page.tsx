// app/dashboard/bus-management/page.tsx
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
import {
  Search,
  Loader2,
  Bus,
  QrCode,
  Banknote,
  CheckCircle,
  XCircle,
  Filter,
  Clock,
  AlertCircle,
  History,
} from "lucide-react"
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
import {
  getBusesWithConductors,
  updateCashRemittanceStatus,
  getRemittanceHistory,
  resetRevenueAfterRemittance,
} from "@/lib/bus-management-service"

// Reusable classes to make scrollbars visible (track + thumb)
const V_SCROLLBAR = "w-3 bg-white/10 hover:bg-white/20 [&>div]:bg-white/60 [&>div:hover]:bg-white [&>div]:rounded-full transition-colors"
const H_SCROLLBAR = "h-3 bg-white/10 hover:bg-white/20 [&>div]:bg-white/60 [&>div:hover]:bg-white [&>div]:rounded-full transition-colors"

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
  const [showHistoryDialog, setShowHistoryDialog] = useState(false)
  const [remittanceAmount, setRemittanceAmount] = useState("")
  const [remittanceNotes, setRemittanceNotes] = useState("")
  const [remittanceHistory, setRemittanceHistory] = useState<any[]>([])
  const [isLoadingHistory, setIsLoadingHistory] = useState(false)

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
      filtered = filtered.filter((bus) => bus.remittanceStatus === "remitted")
    } else if (tab === "pending") {
      filtered = filtered.filter((bus) => bus.remittanceStatus === "pending")
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

      // Reset revenue after remittance is verified
      if (remitted) {
        const bus = buses.find((b) => b.id === busId)
        if (bus) {
          await resetRevenueAfterRemittance(bus.conductorId)
        }
      }

      // Update local state
      const updatedBuses = buses.map((bus) =>
        bus.id === busId
          ? {
            ...bus,
            remittanceStatus: remitted ? "remitted" : "pending",
            cashRemitted: remitted,
            remittanceAmount: remitted ? amount : 0,
            remittanceNotes: remitted ? notes : "",
            verificationTimestamp: remitted ? Date.now() : undefined,
            // Reset revenue to zero if remitted
            cashRevenue: remitted ? 0 : bus.cashRevenue,
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

  // View remittance history for a bus
  const handleViewHistory = async (bus: any) => {
    setSelectedBus(bus)
    setIsLoadingHistory(true)
    setShowHistoryDialog(true)

    try {
      const history = await getRemittanceHistory(
        bus.id,
        bus.conductorId,
        dateRange?.from ? subDays(dateRange.from, 30) : undefined,
        dateRange?.to,
      )
      setRemittanceHistory(history)
    } catch (error) {
      console.error("Error fetching remittance history:", error)
      setRemittanceHistory([])
    } finally {
      setIsLoadingHistory(false)
    }
  }

  // Format date for display
  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp)
    return date.toLocaleDateString() + " " + date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
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
          {/* Update the Tabs section to be more responsive */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="w-full overflow-x-auto pb-2">
                <TabsList className="bg-primary text-white w-auto inline-flex">
                  <TabsTrigger value="all">All Buses</TabsTrigger>
                  <TabsTrigger value="pending">Pending Verification</TabsTrigger>
                  <TabsTrigger value="remitted">Remitted</TabsTrigger>
                </TabsList>
              </div>

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
            <DialogTitle>Verify Cash Remittance</DialogTitle>
            <DialogDescription>
              Verify cash remittance for Bus {selectedBus?.busNumber} operated by {selectedBus?.conductorName}
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
            <Button onClick={handleConfirmRemittance} disabled={isUpdating} variant="secondary">
              {isUpdating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Verifying...
                </>
              ) : (
                "Verify Remittance"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Remittance History Dialog */}
      <Dialog open={showHistoryDialog} onOpenChange={setShowHistoryDialog}>
        <DialogContent className="sm:max-w-[700px] max-h-[80vh] bg-primary text-white overflow-hidden flex flex-col">
          <DialogHeader className="shrink-0">
            <DialogTitle>Remittance History</DialogTitle>
            <DialogDescription>
              Remittance history for Bus {selectedBus?.busNumber} operated by {selectedBus?.conductorName}
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 flex-1 overflow-hidden">
            {isLoadingHistory ? (
              <div className="flex justify-center items-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-white" />
              </div>
            ) : remittanceHistory.length === 0 ? (
              <div className="text-center py-8">
                <p>No remittance history found for this bus.</p>
              </div>
            ) : (
              <div className="rounded-md border border-white/20 overflow-hidden h-full">
                <ScrollArea className="h-[calc(100%-2rem)] max-h-[50vh]">
                  <Table>
                    <TableHeader>
                      <TableRow className="hover:bg-white/10">
                        <TableHead className="text-white sticky top-0 bg-primary z-10">Date</TableHead>
                        <TableHead className="text-white sticky top-0 bg-primary z-10">Amount</TableHead>
                        <TableHead className="text-white sticky top-0 bg-primary z-10">Status</TableHead>
                        <TableHead className="text-white sticky top-0 bg-primary z-10">Revenue ID</TableHead>
                        <TableHead className="text-white sticky top-0 bg-primary z-10">Notes</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {remittanceHistory.map((item) => (
                        <TableRow key={item.id} className="hover:bg-white/10">
                          <TableCell className="text-white">
                            {formatDate(item.timestamp)}
                            {item.verificationTimestamp && (
                              <div className="text-xs text-white/70 mt-1">
                                Verified: {formatDate(item.verificationTimestamp)}
                              </div>
                            )}
                          </TableCell>
                          <TableCell className="font-semibold text-white">{formatCurrency(item.amount)}</TableCell>
                          <TableCell>
                            <Badge
                              className={`${item.status === "remitted"
                                  ? "bg-green-600"
                                  : item.status === "pending"
                                    ? "bg-yellow-600"
                                    : "bg-blue-600"
                                } text-white`}
                            >
                              {item.status === "remitted"
                                ? "Remitted"
                                : item.status === "pending"
                                  ? "Pending"
                                  : "Remitted"}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-white/80 text-xs">{item.revenueId || "N/A"}</TableCell>
                          <TableCell className="text-white/80">{item.notes || "No notes"}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                  {/* Visible vertical & horizontal scrollbars */}
                  <ScrollBar orientation="vertical" className={V_SCROLLBAR} />
                  <ScrollBar orientation="horizontal" className={H_SCROLLBAR} />
                </ScrollArea>
              </div>
            )}
          </div>
          <DialogFooter className="shrink-0">
            <Button variant="outline" onClick={() => setShowHistoryDialog(false)}>
              Close
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
                  ? "There are no buses with pending verification"
                  : activeTab === "remitted"
                    ? "There are no buses with remitted cash"
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
            <TableHeader className="sticky top-0 bg-primary text-white">
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
                      bus.remittanceStatus === "remitted" ? (
                        <Badge className="text-white">
                          <CheckCircle className="mr-1 h-3 w-3" />
                          Remitted
                          {bus.verificationTimestamp && (
                            <span className="ml-1 text-xs">
                              ({new Date(bus.verificationTimestamp).toLocaleDateString()})
                            </span>
                          )}
                        </Badge>
                      ) : bus.remittanceStatus === "pending" ? (
                        <Badge variant="accent" className="text-white">
                          <Clock className="mr-1 h-3 w-3" />
                          Pending Verification
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-white">
                          <AlertCircle className="mr-1 h-3 w-3" />
                          Not Remitted
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
                        <DropdownMenuItem
                          onClick={() => handleViewHistory(bus)}
                          className="bg-blue-600 text-white mb-2"
                        >
                          <History className="mr-2 h-4 w-4" />
                          View History
                        </DropdownMenuItem>

                        {bus.cashRevenue > 0 && bus.remittanceStatus === "pending" && (
                          <DropdownMenuItem
                            onClick={() => handleRemittanceStatusUpdate(bus, true)}
                            className="bg-primary text-white mb-2"
                          >
                            <CheckCircle className="mr-2 h-4 w-4" />
                            Verify Remittance
                          </DropdownMenuItem>
                        )}

                        {bus.remittanceStatus === "pending" && (
                          <DropdownMenuItem
                            onClick={() => handleRemittanceStatusUpdate(bus, false)}
                            className="bg-red-700 text-white"
                          >
                            <XCircle className="mr-2 h-4 w-4" />
                            Reject Remittance
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {/* Visible horizontal scrollbar under the table */}
          <ScrollBar orientation="horizontal" className={H_SCROLLBAR} />
        </ScrollArea>
      </div>
    )
  }
}
