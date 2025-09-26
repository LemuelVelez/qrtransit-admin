/* eslint-disable @typescript-eslint/no-explicit-any */
"use client"

import * as React from "react"
import {
    ColumnDef,
    ColumnFiltersState,
    SortingState,
    VisibilityState,
    getCoreRowModel,
    getFilteredRowModel,
    getPaginationRowModel,
    getSortedRowModel,
    useReactTable,
    flexRender,
} from "@tanstack/react-table"
import {
    RefreshCw,
    ChevronDown,
    ArrowUpDown,
    Loader2,
    Calendar,
    Download,
} from "lucide-react"

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Label } from "@/components/ui/label"
import {
    DropdownMenu,
    DropdownMenuCheckboxItem,
    DropdownMenuContent,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"

import { cn, formatDate } from "@/lib/utils"
import {
    type InspectionRecord,
    envHasInspectionsCollection,
    listInspections,
} from "@/lib/inspections-service"

type TabKey = "cleared"

export default function InspectionsPage() {
    const [activeTab, setActiveTab] = React.useState<TabKey>("cleared")

    const [rows, setRows] = React.useState<InspectionRecord[]>([])
    const [isLoading, setIsLoading] = React.useState(false)

    // Filters
    const [busQuery, setBusQuery] = React.useState("")
    const [inspectorFilter, setInspectorFilter] = React.useState<string>("__all__")
    const [startDate, setStartDate] = React.useState<string>("")
    const [endDate, setEndDate] = React.useState<string>("")

    const fetchRows = React.useCallback(async () => {
        setIsLoading(true)
        try {
            if (!envHasInspectionsCollection()) {
                console.error("Missing NEXT_PUBLIC_APPWRITE_INSPECTIONS_COLLECTION_ID")
                setRows([])
                return
            }

            const data = await listInspections({ onlyCleared: true, enrichInspectorNames: true })
            setRows(data)
        } catch (e) {
            console.error("Failed to load inspections:", e)
            setRows([])
        } finally {
            setIsLoading(false)
        }
    }, [])

    React.useEffect(() => {
        if (activeTab === "cleared") fetchRows()
    }, [activeTab, fetchRows])

    // Derive unique inspectors for the filter dropdown
    const inspectorOptions = React.useMemo(() => {
        const set = new Map<string, string>() // id -> label
        for (const r of rows) {
            const id = r.inspectorId || "unknown"
            const label = r.inspectorName?.trim() || `Inspector ${id.slice(0, 6)}…`
            if (!set.has(id)) set.set(id, label)
        }
        return Array.from(set.entries()).map(([value, label]) => ({ value, label }))
    }, [rows])

    // Table columns
    const columns = React.useMemo<ColumnDef<InspectionRecord>[]>(() => [
        {
            accessorKey: "timestamp",
            header: ({ column }) => (
                <Button
                    variant="ghost"
                    className="cursor-pointer"
                    onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
                >
                    Date <ArrowUpDown className="ml-1 h-4 w-4" />
                </Button>
            ),
            cell: ({ row }) => (
                <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span>{formatDate(row.original.timestamp)}</span>
                </div>
            ),
        },
        {
            accessorKey: "busNumber",
            header: ({ column }) => (
                <Button
                    variant="ghost"
                    className="cursor-pointer"
                    onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
                >
                    Bus # <ArrowUpDown className="ml-1 h-4 w-4" />
                </Button>
            ),
            cell: ({ row }) => <div className="font-medium tabular-nums">#{row.original.busNumber}</div>,
        },
        {
            accessorKey: "conductorName",
            header: ({ column }) => (
                <Button
                    variant="ghost"
                    className="cursor-pointer"
                    onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
                >
                    Conductor <ArrowUpDown className="ml-1 h-4 w-4" />
                </Button>
            ),
            cell: ({ row }) => <div className="truncate max-w-[260px]">{row.original.conductorName || "—"}</div>,
        },
        {
            id: "route",
            header: "Inspection Route",
            cell: ({ row }) => (
                <div className="max-w-[360px]">
                    <div className="rounded-lg bg-muted px-2 py-1 inline-flex items-center gap-2">
                        <span className="text-sm">{row.original.inspectionFrom}</span>
                        <span className="text-muted-foreground">→</span>
                        <span className="text-sm">{row.original.inspectionTo}</span>
                    </div>
                </div>
            ),
        },
        {
            accessorKey: "passengerCount",
            header: ({ column }) => (
                <Button
                    variant="ghost"
                    className="cursor-pointer"
                    onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
                >
                    Pax <ArrowUpDown className="ml-1 h-4 w-4" />
                </Button>
            ),
            cell: ({ row }) => <div className="tabular-nums">{row.original.passengerCount}</div>,
        },
        {
            accessorKey: "inspectorName",
            header: ({ column }) => (
                <Button
                    variant="ghost"
                    className="cursor-pointer"
                    onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
                >
                    Inspector <ArrowUpDown className="ml-1 h-4 w-4" />
                </Button>
            ),
            cell: ({ row }) => (
                <div className="truncate max-w-[220px]">
                    {row.original.inspectorName || `Inspector ${row.original.inspectorId?.slice(0, 6)}…`}
                </div>
            ),
        },
        {
            accessorKey: "status",
            header: "Status",
            cell: ({ row }) => {
                const s = (row.original.status || "").toLowerCase()
                const isCleared = s === "cleared"
                return (
                    <Badge className={cn(isCleared ? "bg-emerald-600" : "bg-slate-700", "text-white")}>
                        {isCleared ? "Cleared" : (row.original.status || "—")}
                    </Badge>
                )
            },
        },
    ], [])

    // Reusable table (tailored for inspections)
    const DataTable = ({
        data,
        columns,
        isLoading,
        onRefresh,
    }: {
        data: InspectionRecord[]
        columns: ColumnDef<InspectionRecord, any>[]
        isLoading: boolean
        onRefresh: () => void
    }) => {
        const [sorting, setSorting] = React.useState<SortingState>([{ id: "timestamp", desc: true }])
        const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([])
        const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>({})

        // Client-side filtering by inspector and date range + bus query
        const filtered = React.useMemo(() => {
            const s = (busQuery || "").trim().toLowerCase()
            const start = startDate ? new Date(startDate) : null
            const end = endDate ? new Date(endDate) : null
            if (end) {
                end.setHours(23, 59, 59, 999)
            }
            return data.filter((r) => {
                // bus query (also match inspector name)
                const matchesQuery =
                    !s ||
                    String(r.busNumber).toLowerCase().includes(s) ||
                    (r.inspectorName || "").toLowerCase().includes(s)

                if (!matchesQuery) return false

                // inspector filter
                if (inspectorFilter !== "__all__" && r.inspectorId !== inspectorFilter) return false

                // date range filter
                if (start || end) {
                    const ts = Number.parseInt(String(r.timestamp), 10)
                    const dt = Number.isFinite(ts) ? new Date(ts) : new Date(r.timestamp)
                    if (start && dt < start) return false
                    if (end && dt > end) return false
                }

                return true
            })
        }, [data, busQuery, inspectorFilter, startDate, endDate])

        const table = useReactTable({
            data: filtered,
            columns,
            onSortingChange: setSorting,
            onColumnFiltersChange: setColumnFilters,
            onColumnVisibilityChange: setColumnVisibility,
            getCoreRowModel: getCoreRowModel(),
            getPaginationRowModel: getPaginationRowModel(),
            getSortedRowModel: getSortedRowModel(),
            getFilteredRowModel: getFilteredRowModel(),
            state: { sorting, columnFilters, columnVisibility },
        })

        // CSV export of currently filtered rows
        const exportCsv = React.useCallback(() => {
            const headers = [
                "Date",
                "Bus #",
                "Conductor",
                "From",
                "To",
                "Passengers",
                "Inspector",
                "Status",
            ]
            const lines = filtered.map((r) => [
                new Date(Number(r.timestamp)).toLocaleString(),
                `#${r.busNumber}`,
                `"${(r.conductorName || "").replace(/"/g, '""')}"`,
                `"${(r.inspectionFrom || "").replace(/"/g, '""')}"`,
                `"${(r.inspectionTo || "").replace(/"/g, '""')}"`,
                r.passengerCount ?? "",
                `"${(r.inspectorName || `Inspector ${r.inspectorId?.slice(0, 6)}…`).replace(/"/g, '""')}"`,
                r.status || "",
            ].join(","))
            const csv = [headers.join(","), ...lines].join("\n")
            const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" })
            const url = URL.createObjectURL(blob)
            const a = document.createElement("a")
            a.href = url
            a.download = `inspections-${Date.now()}.csv`
            a.click()
            URL.revokeObjectURL(url)
        }, [filtered])

        return (
            <Card>
                <CardHeader className="gap-3">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                        <div className="min-w-0">
                            <CardTitle>Cleared Bus Inspections</CardTitle>
                        </div>
                        <div className="flex w-full sm:w-auto flex-col sm:flex-row items-stretch sm:items-center gap-2">
                            {/* Bus / Inspector search */}
                            <Input
                                placeholder="Search bus # or inspector…"
                                value={busQuery}
                                onChange={(e) => setBusQuery(e.target.value)}
                                className="sm:w-[260px]"
                            />

                            {/* Inspector filter */}
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="outline" className="cursor-pointer">
                                        Inspector <ChevronDown className="ml-1 h-4 w-4" />
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                    <DropdownMenuCheckboxItem
                                        className="cursor-pointer"
                                        checked={inspectorFilter === "__all__"}
                                        onCheckedChange={() => setInspectorFilter("__all__")}
                                    >
                                        All
                                    </DropdownMenuCheckboxItem>
                                    {inspectorOptions.map((opt) => (
                                        <DropdownMenuCheckboxItem
                                            key={opt.value}
                                            className="cursor-pointer"
                                            checked={inspectorFilter === opt.value}
                                            onCheckedChange={() => setInspectorFilter(opt.value)}
                                        >
                                            {opt.label}
                                        </DropdownMenuCheckboxItem>
                                    ))}
                                </DropdownMenuContent>
                            </DropdownMenu>

                            {/* Date range */}
                            <div className="flex items-center gap-2">
                                <div className="flex flex-col">
                                    <Label htmlFor="start" className="text-xs text-muted-foreground">Start</Label>
                                    <Input id="start" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
                                </div>
                                <div className="flex flex-col">
                                    <Label htmlFor="end" className="text-xs text-muted-foreground">End</Label>
                                    <Input id="end" type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
                                </div>
                            </div>

                            <Button variant="outline" onClick={onRefresh} disabled={isLoading} className="cursor-pointer">
                                <RefreshCw className={cn("mr-2 h-4 w-4", isLoading && "animate-spin")} />
                                Refresh
                            </Button>

                            <Button onClick={exportCsv} className="text-white cursor-pointer">
                                <Download className="mr-2 h-4 w-4" />
                                Export CSV
                            </Button>
                        </div>
                    </div>
                </CardHeader>

                <CardContent>
                    {isLoading ? (
                        <div className="flex justify-center items-center py-20">
                            <Loader2 className="h-8 w-8 animate-spin text-primary" />
                        </div>
                    ) : (
                        <>
                            <div
                                className={cn(
                                    "overflow-x-auto rounded-md border",
                                    // vivid horizontal scrollbar
                                    "[&::-webkit-scrollbar]:h-3 [&::-webkit-scrollbar-track]:bg-emerald-100",
                                    "[&::-webkit-scrollbar-thumb]:bg-emerald-500 [&::-webkit-scrollbar-thumb]:rounded-full",
                                    "[&::-webkit-scrollbar-thumb:hover]:bg-emerald-600",
                                    "transition-shadow hover:shadow-sm"
                                )}
                            >
                                <Table>
                                    <TableHeader className="sticky top-0">
                                        {table.getHeaderGroups().map((headerGroup) => (
                                            <TableRow key={headerGroup.id} className="hover:bg-muted/40">
                                                {headerGroup.headers.map((header) => (
                                                    <TableHead key={header.id}>
                                                        {header.isPlaceholder
                                                            ? null
                                                            : flexRender(header.column.columnDef.header, header.getContext())}
                                                    </TableHead>
                                                ))}
                                            </TableRow>
                                        ))}
                                    </TableHeader>
                                    <TableBody>
                                        {table.getRowModel().rows?.length ? (
                                            table.getRowModel().rows.map((row) => (
                                                <TableRow key={row.id} className="hover:bg-emerald-50/60 dark:hover:bg-emerald-900/20 transition-colors">
                                                    {row.getVisibleCells().map((cell) => (
                                                        <TableCell key={cell.id}>
                                                            {flexRender(cell.column.columnDef.cell, cell.getContext())}
                                                        </TableCell>
                                                    ))}
                                                </TableRow>
                                            ))
                                        ) : (
                                            <TableRow>
                                                <TableCell colSpan={columns.length} className="h-24 text-center">
                                                    No results.
                                                </TableCell>
                                            </TableRow>
                                        )}
                                    </TableBody>
                                </Table>
                            </div>

                            {/* Pagination */}
                            <div className="flex flex-col sm:flex-row items-stretch sm:items-center sm:justify-end gap-2 py-4">
                                <div className="text-muted-foreground text-sm w-full sm:flex-1">
                                    Showing {table.getRowModel().rows.length} of {filtered.length} filtered record(s).
                                </div>
                                <div className="flex w-full sm:w-auto gap-2">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        className="cursor-pointer w-full sm:w-auto"
                                        onClick={() => table.previousPage()}
                                        disabled={!table.getCanPreviousPage()}
                                    >
                                        Previous
                                    </Button>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        className="cursor-pointer w-full sm:w-auto"
                                        onClick={() => table.nextPage()}
                                        disabled={!table.getCanNextPage()}
                                    >
                                        Next
                                    </Button>
                                </div>
                            </div>
                        </>
                    )}
                </CardContent>
            </Card>
        )
    }

    return (
        <div className="flex flex-col gap-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Inspections</h1>
            </div>

            <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as TabKey)} className="space-y-4">
                <div className="w-full overflow-x-auto pb-2">
                    <TabsList className="bg-primary text-white w-auto inline-flex">
                        <TabsTrigger value="cleared" className="gap-2 cursor-pointer">
                            Cleared History
                        </TabsTrigger>
                    </TabsList>
                </div>

                <TabsContent value="cleared" className="space-y-4">
                    <DataTable
                        data={rows}
                        columns={columns}
                        isLoading={isLoading}
                        onRefresh={fetchRows}
                    />
                </TabsContent>
            </Tabs>
        </div>
    )
}
