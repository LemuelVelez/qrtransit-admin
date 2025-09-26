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
    MapPin,
    Ticket,
    User2,
    ShieldCheck,
} from "lucide-react"

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
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
    SheetDescription,
    SheetFooter,
    SheetClose,
} from "@/components/ui/sheet"
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip"

import { cn, formatDate } from "@/lib/utils"
import {
    type InspectionRecord,
    envHasInspectionsCollection,
    listInspections,
} from "@/lib/inspections-service"

export default function InspectionsPage() {
    const [rows, setRows] = React.useState<InspectionRecord[]>([])
    const [isLoading, setIsLoading] = React.useState(false)

    // Filters
    const [busQuery, setBusQuery] = React.useState("")
    const [inspectorFilter, setInspectorFilter] = React.useState<string>("__all__")
    const [startDate, setStartDate] = React.useState<string>("")
    const [endDate, setEndDate] = React.useState<string>("")

    // Detail drawer
    const [detailOpen, setDetailOpen] = React.useState(false)
    const [selected, setSelected] = React.useState<InspectionRecord | null>(null)

    const openDetails = (record: InspectionRecord) => {
        setSelected(record)
        setDetailOpen(true)
    }

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
        fetchRows()
    }, [fetchRows])

    const inspectorOptions = React.useMemo(() => {
        const map = new Map<string, string>()
        for (const r of rows) {
            const id = r.inspectorId || "unknown"
            const label = r.inspectorName?.trim() || `Inspector ${id.slice(0, 6)}…`
            if (!map.has(id)) map.set(id, label)
        }
        return Array.from(map.entries()).map(([value, label]) => ({ value, label }))
    }, [rows])

    const filteredRows = React.useMemo(() => {
        const q = (busQuery || "").trim().toLowerCase()
        const start = startDate ? new Date(startDate) : null
        const end = endDate ? new Date(endDate) : null
        if (end) end.setHours(23, 59, 59, 999)

        return rows.filter((r) => {
            const matchesQ =
                !q ||
                String(r.busNumber).toLowerCase().includes(q) ||
                (r.inspectorName || "").toLowerCase().includes(q)

            if (!matchesQ) return false
            if (inspectorFilter !== "__all__" && r.inspectorId !== inspectorFilter) return false

            if (start || end) {
                const raw = String(r.timestamp)
                const ms = /^\d+$/.test(raw) ? Number(raw) : Date.parse(raw)
                const dt = new Date(ms)
                if (start && dt < start) return false
                if (end && dt > end) return false
            }
            return true
        })
    }, [rows, busQuery, inspectorFilter, startDate, endDate])

    const columns = React.useMemo<ColumnDef<InspectionRecord>[]>(() => [
        {
            accessorKey: "timestamp",
            header: ({ column }) => (
                <Button
                    variant="ghost"
                    className="cursor-pointer whitespace-nowrap"
                    onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
                >
                    Date <ArrowUpDown className="ml-1 h-4 w-4" />
                </Button>
            ),
            cell: ({ row }) => (
                <div className="flex items-center gap-2 whitespace-nowrap">
                    <Calendar className="h-4 w-4 text-muted-foreground shrink-0" />
                    <span className="truncate">{formatDate(row.original.timestamp)}</span>
                </div>
            ),
            meta: { width: 200 },
        },
        {
            accessorKey: "busNumber",
            header: ({ column }) => (
                <Button
                    variant="ghost"
                    className="cursor-pointer whitespace-nowrap"
                    onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
                >
                    Bus # <ArrowUpDown className="ml-1 h-4 w-4" />
                </Button>
            ),
            cell: ({ row }) => <div className="font-semibold tabular-nums whitespace-nowrap">#{row.original.busNumber}</div>,
            meta: { width: 110 },
        },
        {
            id: "route",
            header: "Route",
            cell: ({ row }) => {
                const from = row.original.inspectionFrom || "—"
                const to = row.original.inspectionTo || "—"
                return (
                    <TooltipProvider>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <div className="max-w-[540px]">
                                    <div className="rounded-md bg-muted px-2 py-1 inline-flex items-center gap-2 w-full">
                                        <MapPin className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                                        <span className="text-sm truncate">{from}</span>
                                        <span className="text-muted-foreground shrink-0">→</span>
                                        <span className="text-sm truncate">{to}</span>
                                    </div>
                                </div>
                            </TooltipTrigger>
                            <TooltipContent side="top" align="start" className="max-w-[420px] break-words">
                                <p className="text-sm">{from} → {to}</p>
                            </TooltipContent>
                        </Tooltip>
                    </TooltipProvider>
                )
            },
            meta: { width: 600 },
        },
        {
            accessorKey: "inspectorName",
            header: ({ column }) => (
                <Button
                    variant="ghost"
                    className="cursor-pointer whitespace-nowrap"
                    onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
                >
                    Inspector <ArrowUpDown className="ml-1 h-4 w-4" />
                </Button>
            ),
            cell: ({ row }) => {
                const label = row.original.inspectorName || `Inspector ${row.original.inspectorId?.slice(0, 6)}…`
                return (
                    <TooltipProvider>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <div className="truncate max-w-[260px] flex items-center gap-2">
                                    <ShieldCheck className="h-4 w-4 text-muted-foreground shrink-0" />
                                    <span className="truncate">{label}</span>
                                </div>
                            </TooltipTrigger>
                            <TooltipContent side="top" align="start" className="max-w-[360px] break-words">
                                <p className="text-sm">{label}</p>
                            </TooltipContent>
                        </Tooltip>
                    </TooltipProvider>
                )
            },
            meta: { width: 300 },
        },
        {
            accessorKey: "status",
            header: "Status",
            cell: ({ row }) => {
                const s = (row.original.status || "").toLowerCase()
                const isCleared = s === "cleared"
                return (
                    <Badge className={cn("text-white whitespace-nowrap", isCleared ? "bg-emerald-600 hover:bg-emerald-600/90" : "bg-slate-700 hover:bg-slate-700/90")}>
                        {isCleared ? "Cleared" : (row.original.status || "—")}
                    </Badge>
                )
            },
            meta: { width: 120 },
        },
    ], [])

    const DataTable = ({
        data,
        columns,
        isLoading,
        onRefresh,
        onRowClick,
    }: {
        data: InspectionRecord[]
        columns: ColumnDef<InspectionRecord, any>[]
        isLoading: boolean
        onRefresh: () => void
        onRowClick: (rec: InspectionRecord) => void
    }) => {
        const [sorting, setSorting] = React.useState<SortingState>([{ id: "timestamp", desc: true }])
        const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([])
        const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>({})

        const table = useReactTable({
            data,
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

        // CSV exporter (quoted, ISO dates, BOM)
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
            const q = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`

            const body = data.map((r) => {
                const raw = String(r.timestamp)
                const ms = /^\d+$/.test(raw) ? Number(raw) : Date.parse(raw)
                const iso = Number.isFinite(ms) ? new Date(ms).toISOString() : String(r.timestamp)
                return [
                    iso,
                    `#${r.busNumber ?? ""}`,
                    r.conductorName ?? "",
                    r.inspectionFrom ?? "",
                    r.inspectionTo ?? "",
                    r.passengerCount ?? "",
                    r.inspectorName || (r.inspectorId ? `Inspector ${r.inspectorId.slice(0, 6)}…` : ""),
                    r.status ?? "",
                ].map(q).join(",")
            }).join("\r\n")

            const csv = [headers.join(","), body].join("\r\n")
            const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" })
            const url = URL.createObjectURL(blob)
            const a = document.createElement("a")
            a.href = url
            a.download = `inspections-${Date.now()}.csv`
            a.click()
            URL.revokeObjectURL(url)
        }, [data])

        return (
            <Card>
                <CardHeader className="gap-3">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                        <div className="min-w-0">
                            <CardTitle>Cleared Bus Inspections</CardTitle>
                        </div>
                        <div className="flex w-full sm:w-auto flex-col sm:flex-row items-stretch sm:items-center gap-2">
                            <Button variant="outline" onClick={onRefresh} disabled={isLoading} className="cursor-pointer w-full sm:w-auto">
                                <RefreshCw className={cn("mr-2 h-4 w-4", isLoading && "animate-spin")} />
                                Refresh
                            </Button>
                            <Button onClick={exportCsv} className="text-white cursor-pointer w-full sm:w-auto">
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
                                    "[&::-webkit-scrollbar]:h-3 [&::-webkit-scrollbar-track]:bg-emerald-100/60 dark:[&::-webkit-scrollbar-track]:bg-emerald-900/20",
                                    "[&::-webkit-scrollbar-thumb]:bg-emerald-500/80 [&::-webkit-scrollbar-thumb]:rounded-full",
                                    "[&::-webkit-scrollbar-thumb:hover]:bg-emerald-600",
                                    "transition-shadow hover:shadow-sm"
                                )}
                            >
                                <Table className="table-fixed min-w-[1080px]">
                                    <TableHeader className="sticky top-0 z-10 bg-background">
                                        {table.getHeaderGroups().map((headerGroup) => (
                                            <TableRow key={headerGroup.id} className="hover:bg-transparent">
                                                {headerGroup.headers.map((header) => {
                                                    const width = (header.column.columnDef.meta as any)?.width as number | undefined
                                                    return (
                                                        <TableHead key={header.id} style={width ? { width, maxWidth: width } : undefined} className={cn(width && "truncate")}>
                                                            {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                                                        </TableHead>
                                                    )
                                                })}
                                            </TableRow>
                                        ))}
                                    </TableHeader>
                                    <TableBody>
                                        {table.getRowModel().rows?.length ? (
                                            table.getRowModel().rows.map((row) => (
                                                <TableRow
                                                    key={row.id}
                                                    onClick={() => onRowClick(row.original)}
                                                    className={cn(
                                                        "group cursor-pointer align-middle h-12",
                                                        "hover:bg-emerald-50/60 dark:hover:bg-emerald-900/20 transition-colors"
                                                    )}
                                                    title="Click to view full details"
                                                >
                                                    {row.getVisibleCells().map((cell) => {
                                                        const width = (cell.column.columnDef.meta as any)?.width as number | undefined
                                                        const isStatus = cell.column.id === "status"
                                                        return (
                                                            <TableCell
                                                                key={cell.id}
                                                                style={width ? { width, maxWidth: width } : undefined}
                                                                className={cn("overflow-hidden", isStatus && "group-hover:[&_div]:no-underline")}
                                                            >
                                                                <div
                                                                    className={cn(
                                                                        "truncate",
                                                                        !isStatus && "group-hover:underline group-hover:decoration-dotted group-hover:underline-offset-4"
                                                                    )}
                                                                >
                                                                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                                                                </div>
                                                            </TableCell>
                                                        )
                                                    })}
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

                            {/* Pagination — vertical stack on mobile */}
                            <div className="flex flex-col sm:flex-row items-stretch sm:items-center sm:justify-end gap-2 py-4">
                                <div className="text-muted-foreground text-sm w-full sm:flex-1">
                                    Showing {table.getRowModel().rows.length} of {data.length} filtered record(s).
                                </div>
                                <div className="flex flex-col sm:flex-row w-full sm:w-auto gap-2">
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
        <>
            <div className="flex flex-col gap-4">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                    <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Inspections</h1>
                </div>

                {/* Filters card */}
                <Card className="border-dashed">
                    <CardContent className="pt-6">
                        <div className="flex w-full flex-col md:flex-row gap-3">
                            {/* Search (full width on mobile) */}
                            <div className="flex-1">
                                <Input
                                    placeholder="Search bus # or inspector…"
                                    value={busQuery}
                                    onChange={(e) => setBusQuery(e.target.value)}
                                    className="w-full"
                                />
                            </div>

                            {/* Inspector selector — full width on mobile */}
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="outline" className="cursor-pointer w-full sm:w-auto">
                                        Inspector <ChevronDown className="ml-1 h-4 w-4" />
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="start">
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

                            {/* Start & End — vertical on mobile, horizontal on ≥sm */}
                            <div className="flex flex-col sm:flex-row w-full sm:w-auto gap-2">
                                <div className="flex flex-col w-full">
                                    <Label htmlFor="start" className="text-xs text-muted-foreground">Start</Label>
                                    <Input
                                        id="start"
                                        type="date"
                                        value={startDate}
                                        onChange={(e) => setStartDate(e.target.value)}
                                        className="w-full"
                                    />
                                </div>
                                <div className="flex flex-col w-full">
                                    <Label htmlFor="end" className="text-xs text-muted-foreground">End</Label>
                                    <Input
                                        id="end"
                                        type="date"
                                        value={endDate}
                                        onChange={(e) => setEndDate(e.target.value)}
                                        className="w-full"
                                    />
                                </div>
                            </div>

                            {/* Refresh — full width on mobile */}
                            <Button
                                variant="outline"
                                onClick={fetchRows}
                                disabled={isLoading}
                                className="cursor-pointer w-full sm:w-auto"
                            >
                                <RefreshCw className={cn("mr-2 h-4 w-4", isLoading && "animate-spin")} />
                                Refresh
                            </Button>
                        </div>
                    </CardContent>
                </Card>

                <DataTable
                    data={filteredRows}
                    columns={columns}
                    isLoading={isLoading}
                    onRefresh={fetchRows}
                    onRowClick={openDetails}
                />
            </div>

            {/* Detail Drawer */}
            <Sheet open={detailOpen} onOpenChange={setDetailOpen}>
                <SheetContent side="right" className="w-full sm:max-w-xl bg-black">
                    <SheetHeader>
                        <SheetTitle className="flex items-center gap-2">
                            <Calendar className="h-5 w-5 text-muted-foreground" />
                            {selected ? formatDate(selected.timestamp) : "Details"}
                        </SheetTitle>
                        <SheetDescription>Complete inspection information</SheetDescription>
                    </SheetHeader>

                    {selected ? (
                        <div className="mt-4 space-y-4">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <Info label="Bus #">#{selected.busNumber}</Info>
                                <Info label="Status">
                                    <Badge className="bg-emerald-600 text-white">{selected.status || "—"}</Badge>
                                </Info>
                                <Info label="Inspector">
                                    <div className="flex items-center gap-2">
                                        <ShieldCheck className="h-4 w-4 text-muted-foreground" />
                                        <span className="break-words">{selected.inspectorName || `Inspector ${selected.inspectorId?.slice(0, 6)}…`}</span>
                                    </div>
                                </Info>
                                <Info label="Conductor">
                                    <div className="flex items-center gap-2">
                                        <User2 className="h-4 w-4 text-muted-foreground" />
                                        <span className="break-words">{selected.conductorName || "—"}</span>
                                    </div>
                                </Info>
                                <Info label="Passengers">
                                    <div className="flex items-center gap-2">
                                        <Ticket className="h-4 w-4 text-muted-foreground" />
                                        <span className="tabular-nums">{selected.passengerCount ?? "—"}</span>
                                    </div>
                                </Info>
                                <Info label="Timestamp (raw)">
                                    <span className="tabular-nums">{String(selected.timestamp)}</span>
                                </Info>
                            </div>

                            <div className="space-y-2">
                                <Label className="text-xs text-muted-foreground">Route</Label>
                                <div className="rounded-xl border p-3 bg-muted/50 flex flex-wrap items-center gap-2 break-words">
                                    <span className="px-2 py-1 rounded-md bg-background">{selected.inspectionFrom || "—"}</span>
                                    <span className="text-muted-foreground">→</span>
                                    <span className="px-2 py-1 rounded-md bg-background">{selected.inspectionTo || "—"}</span>
                                </div>
                            </div>
                        </div>
                    ) : null}

                    <SheetFooter className="mt-6">
                        <SheetClose asChild>
                            <Button variant="outline" className="cursor-pointer">Close</Button>
                        </SheetClose>
                    </SheetFooter>
                </SheetContent>
            </Sheet>
        </>
    )
}

function Info({ label, children }: { label: string; children: React.ReactNode }) {
    return (
        <div className="rounded-lg border p-3 bg-card/50">
            <div className="text-xs text-muted-foreground mb-1">{label}</div>
            <div className="font-medium leading-relaxed">{children}</div>
        </div>
    )
}
