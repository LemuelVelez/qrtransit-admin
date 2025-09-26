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
    Plus,
    RefreshCw,
    ChevronDown,
    MoreHorizontal,
    ArrowUpDown,
    Loader2,
    Pencil,
    Trash2,
} from "lucide-react"

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Badge } from "@/components/ui/badge"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import {
    DropdownMenu,
    DropdownMenuCheckboxItem,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
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
    type FareConfig,
    type DiscountConfig,
    listFares,
    createFare,
    updateFare,
    deleteFare,
    listDiscounts,
    createDiscount,
    updateDiscount,
    deleteDiscount,
} from "@/lib/fare-management-service"

type TabKey = "fares" | "discounts"

export default function FareManagementPage() {
    const [activeTab, setActiveTab] = React.useState<TabKey>("fares")

    /* ----------------------- FARES state & fetching ----------------------- */
    const [fares, setFares] = React.useState<FareConfig[]>([])
    const [isLoadingFares, setIsLoadingFares] = React.useState(false)
    const fetchFares = React.useCallback(async () => {
        setIsLoadingFares(true)
        try {
            const rows = await listFares()
            rows.sort((a, b) => Number(a.kilometer) - Number(b.kilometer))
            setFares(rows)
        } catch (e) {
            console.error("Failed to load fares:", e)
            setFares([])
        } finally {
            setIsLoadingFares(false)
        }
    }, [])

    /* -------------------- DISCOUNTS state & fetching --------------------- */
    const [discounts, setDiscounts] = React.useState<DiscountConfig[]>([])
    const [isLoadingDiscounts, setIsLoadingDiscounts] = React.useState(false)
    const fetchDiscounts = React.useCallback(async () => {
        setIsLoadingDiscounts(true)
        try {
            const rows = await listDiscounts()
            rows.sort((a, b) => (a.passengerType || "").localeCompare(b.passengerType || ""))
            setDiscounts(rows)
        } catch (e) {
            console.error("Failed to load discounts:", e)
            setDiscounts([])
        } finally {
            setIsLoadingDiscounts(false)
        }
    }, [])

    React.useEffect(() => {
        if (activeTab === "fares") fetchFares()
    }, [activeTab, fetchFares])

    React.useEffect(() => {
        if (activeTab === "discounts") fetchDiscounts()
    }, [activeTab, fetchDiscounts])

    /* ---------------------------- FARE dialog ---------------------------- */
    const [fareDialogOpen, setFareDialogOpen] = React.useState(false)
    const [fareSaving, setFareSaving] = React.useState(false)
    const [fareEditing, setFareEditing] = React.useState<FareConfig | null>(null)
    const [fareForm, setFareForm] = React.useState<{
        kilometer: string
        fare: string
        busType: string
        description: string
        active: boolean
    }>({ kilometer: "", fare: "", busType: "", description: "", active: true })

    const openCreateFare = () => {
        setFareEditing(null)
        setFareForm({ kilometer: "", fare: "", busType: "", description: "", active: true })
        setFareDialogOpen(true)
    }

    const openEditFare = (row: FareConfig) => {
        setFareEditing(row)
        setFareForm({
            kilometer: row.kilometer ?? "",
            fare: row.fare ?? "",
            busType: row.busType ?? "",
            description: row.description ?? "",
            active: !!row.active,
        })
        setFareDialogOpen(true)
    }

    const saveFare = async () => {
        if (!fareForm.kilometer || !fareForm.fare) {
            alert("Please provide both Kilometer and Fare.")
            return
        }
        setFareSaving(true)
        try {
            if (fareEditing) {
                await updateFare(fareEditing.id, {
                    kilometer: String(fareForm.kilometer),
                    fare: String(fareForm.fare),
                    description: fareForm.description || "",
                    busType: fareForm.busType.trim() || undefined,
                    active: !!fareForm.active,
                })
            } else {
                await createFare({
                    kilometer: String(fareForm.kilometer),
                    fare: String(fareForm.fare),
                    description: fareForm.description || "",
                    busType: fareForm.busType.trim() || undefined,
                    active: !!fareForm.active,
                })
            }
            setFareDialogOpen(false)
            await fetchFares()
        } catch (e) {
            console.error("Save fare failed:", e)
            alert("Failed to save fare. See console for details.")
        } finally {
            setFareSaving(false)
        }
    }

    /* ------------------------- DISCOUNT dialog --------------------------- */
    const [discountDialogOpen, setDiscountDialogOpen] = React.useState(false)
    const [discountSaving, setDiscountSaving] = React.useState(false)
    const [discountEditing, setDiscountEditing] = React.useState<DiscountConfig | null>(null)
    const [discountForm, setDiscountForm] = React.useState<{
        passengerType: string
        discountPercentage: string
        description: string
        active: boolean
    }>({ passengerType: "", discountPercentage: "", description: "", active: true })

    const openCreateDiscount = () => {
        setDiscountEditing(null)
        setDiscountForm({ passengerType: "", discountPercentage: "", description: "", active: true })
        setDiscountDialogOpen(true)
    }

    const openEditDiscount = (row: DiscountConfig) => {
        setDiscountEditing(row)
        setDiscountForm({
            passengerType: row.passengerType ?? "",
            discountPercentage: row.discountPercentage ?? "",
            description: row.description ?? "",
            active: !!row.active,
        })
        setDiscountDialogOpen(true)
    }

    const saveDiscount = async () => {
        if (!discountForm.passengerType) {
            alert("Please provide the Passenger Type.")
            return
        }
        setDiscountSaving(true)
        try {
            if (discountEditing) {
                await updateDiscount(discountEditing.id, {
                    passengerType: discountForm.passengerType,
                    discountPercentage: String(discountForm.discountPercentage || "0"),
                    description: discountForm.description || "",
                    active: !!discountForm.active,
                })
            } else {
                await createDiscount({
                    passengerType: discountForm.passengerType,
                    discountPercentage: String(discountForm.discountPercentage || "0"),
                    description: discountForm.description || "",
                    active: !!discountForm.active,
                })
            }
            setDiscountDialogOpen(false)
            await fetchDiscounts()
        } catch (e) {
            console.error("Save discount failed:", e)
            alert("Failed to save discount. See console for details.")
        } finally {
            setDiscountSaving(false)
        }
    }

    /* ----------------------- AlertDialog (DELETE) ------------------------ */
    const [confirmOpen, setConfirmOpen] = React.useState(false)
    const [confirmKind, setConfirmKind] = React.useState<
        "fare" | "discount" | "fare-bulk" | "discount-bulk"
    >("fare")
    const [confirmId, setConfirmId] = React.useState<string | null>(null)
    const [confirmIds, setConfirmIds] = React.useState<string[] | null>(null)
    const [confirmName, setConfirmName] = React.useState<string>("")

    const askDeleteFare = (row: FareConfig) => {
        setConfirmKind("fare")
        setConfirmId(row.id)
        setConfirmIds(null)
        setConfirmName(`${row.kilometer} km → ₱${Number(row.fare || 0).toFixed(2)}`)
        setConfirmOpen(true)
    }

    const askDeleteDiscount = (row: DiscountConfig) => {
        setConfirmKind("discount")
        setConfirmId(row.id)
        setConfirmIds(null)
        setConfirmName(`${row.passengerType} (${Number(row.discountPercentage || 0).toFixed(2)}%)`)
        setConfirmOpen(true)
    }

    // Bulk delete prompts
    const askBulkDeleteFares = (rows: FareConfig[]) => {
        const ids = rows.map((r) => r.id as string).filter(Boolean)
        if (!ids.length) return
        setConfirmKind("fare-bulk")
        setConfirmId(null)
        setConfirmIds(ids)
        setConfirmName(`${ids.length} selected`)
        setConfirmOpen(true)
    }

    const askBulkDeleteDiscounts = (rows: DiscountConfig[]) => {
        const ids = rows.map((r) => r.id as string).filter(Boolean)
        if (!ids.length) return
        setConfirmKind("discount-bulk")
        setConfirmId(null)
        setConfirmIds(ids)
        setConfirmName(`${ids.length} selected`)
        setConfirmOpen(true)
    }

    const handleConfirmDelete = async () => {
        const isBulk = confirmKind === "fare-bulk" || confirmKind === "discount-bulk"

        try {
            if (isBulk && confirmIds?.length) {
                if (confirmKind === "fare-bulk") {
                    await Promise.allSettled(confirmIds.map((id) => deleteFare(id)))
                    await fetchFares()
                } else {
                    await Promise.allSettled(confirmIds.map((id) => deleteDiscount(id)))
                    await fetchDiscounts()
                }
            } else if (confirmId) {
                if (confirmKind === "fare") {
                    await deleteFare(confirmId)
                    await fetchFares()
                } else if (confirmKind === "discount") {
                    await deleteDiscount(confirmId)
                    await fetchDiscounts()
                }
            }
        } catch (e) {
            console.error("Delete failed:", e)
            alert("Failed to delete.")
        } finally {
            setConfirmOpen(false)
            setConfirmId(null)
            setConfirmIds(null)
            setConfirmName("")
        }
    }

    /* ---------------------- Stable togglers (useCallback) ---------------- */
    const toggleFareActive = React.useCallback(
        async (row: FareConfig) => {
            try {
                await updateFare(row.id, { active: !row.active })
                setFares((prev) => prev.map((f) => (f.id === row.id ? { ...f, active: !f.active } : f)))
            } catch (e) {
                console.error("Toggle fare failed:", e)
                alert("Failed to update status.")
            }
        },
        [setFares]
    )

    const toggleDiscountActive = React.useCallback(
        async (row: DiscountConfig) => {
            try {
                await updateDiscount(row.id, { active: !row.active })
                setDiscounts((prev) => prev.map((d) => (d.id === row.id ? { ...d, active: !d.active } : d)))
            } catch (e) {
                console.error("Toggle discount failed:", e)
                alert("Failed to update status.")
            }
        },
        [setDiscounts]
    )

    /* ------------------------- FARE table columns ------------------------ */
    const fareColumns = React.useMemo<ColumnDef<FareConfig>[]>(() => [
        {
            id: "select",
            header: ({ table }) => {
                const all = table.getIsAllPageRowsSelected()
                const some = table.getIsSomePageRowsSelected()
                const checked = all ? true : (some ? ("indeterminate" as const) : false)
                return (
                    <Checkbox
                        checked={checked}
                        onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
                        aria-label="Select all"
                    />
                )
            },
            cell: ({ row }) => (
                <Checkbox
                    checked={row.getIsSelected()}
                    onCheckedChange={(value) => row.toggleSelected(!!value)}
                    aria-label="Select row"
                />
            ),
            enableSorting: false,
            enableHiding: false,
            size: 40,
        },
        {
            accessorKey: "kilometer",
            header: ({ column }) => (
                <Button
                    variant="ghost"
                    className="cursor-pointer"
                    onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
                >
                    Kilometer <ArrowUpDown className="ml-1 h-4 w-4" />
                </Button>
            ),
            cell: ({ row }) => <div className="tabular-nums">{row.getValue("kilometer")}</div>,
        },
        {
            accessorKey: "fare",
            header: ({ column }) => (
                <Button
                    variant="ghost"
                    className="cursor-pointer"
                    onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
                >
                    Fare <ArrowUpDown className="ml-1 h-4 w-4" />
                </Button>
            ),
            cell: ({ row }) => {
                const v = Number(row.getValue("fare") || 0)
                return <div className="tabular-nums">₱{v.toFixed(2)}</div>
            },
        },
        {
            accessorKey: "busType",
            header: "Bus Type",
            cell: ({ row }) =>
                row.original.busType ? row.original.busType : <span className="text-muted-foreground">—</span>,
        },
        {
            accessorKey: "description",
            header: "Description",
            cell: ({ row }) => (
                <div className="max-w-[360px] truncate" title={row.original.description || ""}>
                    {row.original.description || <span className="text-muted-foreground">—</span>}
                </div>
            ),
        },
        {
            accessorKey: "active",
            header: "Status",
            cell: ({ row }) => (
                <div className="flex items-center gap-2">
                    <Badge className={cn(row.original.active ? "bg-emerald-600" : "bg-slate-700", "text-white")}>
                        {row.original.active ? "Active" : "Inactive"}
                    </Badge>
                    <Switch
                        className="cursor-pointer"
                        checked={row.original.active}
                        onCheckedChange={() => toggleFareActive(row.original)}
                    />
                </div>
            ),
        },
        {
            accessorKey: "createdAt",
            header: ({ column }) => (
                <Button
                    variant="ghost"
                    className="cursor-pointer"
                    onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
                >
                    Created <ArrowUpDown className="ml-1 h-4 w-4" />
                </Button>
            ),
            cell: ({ row }) => <div>{formatDate(row.original.createdAt)}</div>,
        },
        {
            id: "actions",
            enableHiding: false,
            cell: ({ row }) => {
                const item = row.original
                return (
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="h-8 w-8 p-0 cursor-pointer" title="Actions">
                                <span className="sr-only">Open menu</span>
                                <MoreHorizontal className="h-4 w-4" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="bg-black">
                            <DropdownMenuLabel>Actions</DropdownMenuLabel>
                            <DropdownMenuItem className="cursor-pointer" onClick={() => openEditFare(item)}>
                                <Pencil className="mr-2 h-4 w-4" /> Edit
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem className="text-red-600 cursor-pointer" onClick={() => askDeleteFare(item)}>
                                <Trash2 className="mr-2 h-4 w-4" /> Delete
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                )
            },
        },
    ], [toggleFareActive])

    /* ---------------------- DISCOUNT table columns ----------------------- */
    const discountColumns = React.useMemo<ColumnDef<DiscountConfig>[]>(() => [
        {
            id: "select",
            header: ({ table }) => {
                const all = table.getIsAllPageRowsSelected()
                const some = table.getIsSomePageRowsSelected()
                const checked = all ? true : (some ? ("indeterminate" as const) : false)
                return (
                    <Checkbox
                        checked={checked}
                        onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
                        aria-label="Select all"
                    />
                )
            },
            cell: ({ row }) => (
                <Checkbox
                    checked={row.getIsSelected()}
                    onCheckedChange={(value) => row.toggleSelected(!!value)}
                    aria-label="Select row"
                />
            ),
            enableSorting: false,
            enableHiding: false,
            size: 40,
        },
        {
            accessorKey: "passengerType",
            header: ({ column }) => (
                <Button
                    variant="ghost"
                    className="cursor-pointer"
                    onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
                >
                    Passenger Type <ArrowUpDown className="ml-1 h-4 w-4" />
                </Button>
            ),
            cell: ({ row }) => <div className="font-medium">{row.getValue("passengerType")}</div>,
        },
        {
            accessorKey: "discountPercentage",
            header: ({ column }) => (
                <Button
                    variant="ghost"
                    className="cursor-pointer"
                    onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
                >
                    Discount % <ArrowUpDown className="ml-1 h-4 w-4" />
                </Button>
            ),
            cell: ({ row }) => {
                const v = Number(row.getValue("discountPercentage") || 0)
                return <div className="tabular-nums">{v.toFixed(2)}%</div>
            },
        },
        {
            accessorKey: "description",
            header: "Description",
            cell: ({ row }) => (
                <div className="max-w-[360px] truncate" title={row.original.description || ""}>
                    {row.original.description || <span className="text-muted-foreground">—</span>}
                </div>
            ),
        },
        {
            accessorKey: "active",
            header: "Status",
            cell: ({ row }) => (
                <div className="flex items-center gap-2">
                    <Badge className={cn(row.original.active ? "bg-emerald-600" : "bg-slate-700", "text-white")}>
                        {row.original.active ? "Active" : "Inactive"}
                    </Badge>
                    <Switch
                        className="cursor-pointer"
                        checked={row.original.active}
                        onCheckedChange={() => toggleDiscountActive(row.original)}
                    />
                </div>
            ),
        },
        {
            accessorKey: "createdAt",
            header: ({ column }) => (
                <Button
                    variant="ghost"
                    className="cursor-pointer"
                    onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
                >
                    Created <ArrowUpDown className="ml-1 h-4 w-4" />
                </Button>
            ),
            cell: ({ row }) => <div>{formatDate(row.original.createdAt)}</div>,
        },
        {
            id: "actions",
            enableHiding: false,
            cell: ({ row }) => {
                const item = row.original
                return (
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="h-8 w-8 p-0 cursor-pointer" title="Actions">
                                <span className="sr-only">Open menu</span>
                                <MoreHorizontal className="h-4 w-4" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="bg-black">
                            <DropdownMenuLabel>Actions</DropdownMenuLabel>
                            <DropdownMenuItem className="cursor-pointer" onClick={() => openEditDiscount(item)}>
                                <Pencil className="mr-2 h-4 w-4" /> Edit
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                                className="text-red-600 cursor-pointer"
                                onClick={() => askDeleteDiscount(item)}
                            >
                                <Trash2 className="mr-2 h-4 w-4" /> Delete
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                )
            },
        },
    ], [toggleDiscountActive])

    /* ---------------------- Reusable DataTable wrapper ------------------- */
    const DataTable = <T extends { id?: string },>({
        title,
        data,
        columns,
        isLoading,
        filterKey,
        onRefresh,
        onAdd,
        onDeleteSelected,
    }: {
        title: string
        data: T[]
        columns: ColumnDef<T, any>[]
        isLoading: boolean
        filterKey: keyof T | null
        onRefresh: () => void
        onAdd: () => void
        onDeleteSelected: (rows: T[]) => void
    }) => {
        const [sorting, setSorting] = React.useState<SortingState>([])
        const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([])
        const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>({})
        const [rowSelection, setRowSelection] = React.useState({})

        const table = useReactTable({
            data,
            columns,
            onSortingChange: setSorting,
            onColumnFiltersChange: setColumnFilters,
            onColumnVisibilityChange: setColumnVisibility,
            onRowSelectionChange: setRowSelection,
            getCoreRowModel: getCoreRowModel(),
            getPaginationRowModel: getPaginationRowModel(),
            getSortedRowModel: getSortedRowModel(),
            getFilteredRowModel: getFilteredRowModel(),
            state: { sorting, columnFilters, columnVisibility, rowSelection },
        })

        const filterCol = filterKey ? table.getColumn(String(filterKey)) : null
        const selectedRows = table.getFilteredSelectedRowModel().rows
        const hasSelection = selectedRows.length > 0

        return (
            <Card>
                <CardHeader className="gap-3">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                        <div className="min-w-0">
                            <CardTitle>{title}</CardTitle>
                        </div>
                        <div className="flex w-full sm:w-auto flex-col sm:flex-row items-stretch sm:items-center gap-2">
                            {filterCol && (
                                <Input
                                    placeholder={`Filter ${filterKey as string}...`}
                                    value={(filterCol.getFilterValue() as string) ?? ""}
                                    onChange={(e) => filterCol.setFilterValue(e.target.value)}
                                    className="sm:w-[280px]"
                                />
                            )}
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="outline" className="cursor-pointer">
                                        Columns <ChevronDown className="ml-1 h-4 w-4" />
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                    {table
                                        .getAllColumns()
                                        .filter((column) => column.getCanHide())
                                        .map((column) => (
                                            <DropdownMenuCheckboxItem
                                                key={column.id}
                                                className="capitalize cursor-pointer"
                                                checked={column.getIsVisible()}
                                                onCheckedChange={(value) => column.toggleVisibility(!!value)}
                                            >
                                                {column.id}
                                            </DropdownMenuCheckboxItem>
                                        ))}
                                </DropdownMenuContent>
                            </DropdownMenu>
                            <Button
                                variant="outline"
                                onClick={onRefresh}
                                disabled={isLoading}
                                className="cursor-pointer"
                            >
                                <RefreshCw className={cn("mr-2 h-4 w-4", isLoading && "animate-spin")} />
                                Refresh
                            </Button>
                            <Button onClick={onAdd} className="text-white cursor-pointer">
                                <Plus className="mr-2 h-4 w-4" />
                                Add
                            </Button>
                            <Button
                                variant="destructive"
                                className="cursor-pointer"
                                disabled={!hasSelection}
                                onClick={() => onDeleteSelected(selectedRows.map((r) => r.original))}
                                title={hasSelection ? "Delete selected rows" : "Select rows to delete"}
                            >
                                <Trash2 className="mr-2 h-4 w-4" />
                                Delete selected{hasSelection ? ` (${selectedRows.length})` : ""}
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
                                    // subtle hover depth
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
                                                <TableRow
                                                    key={row.id}
                                                    data-state={row.getIsSelected() && "selected"}
                                                    className="hover:bg-emerald-50/60 dark:hover:bg-emerald-900/20 transition-colors"
                                                >
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

                            {/* Responsive selection info + pagination: STACKED vertically on mobile, horizontal from sm: */}
                            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 py-4">
                                <div className="w-full">
                                    <div className="text-muted-foreground text-sm text-center sm:text-left">
                                        {selectedRows.length} of {table.getFilteredRowModel().rows.length} row(s) selected.
                                    </div>
                                </div>

                                <div className="flex w-full sm:w-auto flex-col sm:flex-row gap-2">
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
                <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Fare Management</h1>
            </div>

            <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as TabKey)} className="space-y-4">
                <div className="w-full overflow-x-auto pb-2">
                    <TabsList className="bg-primary text-white w-auto inline-flex">
                        <TabsTrigger value="fares" className="gap-2 cursor-pointer">
                            Fares
                        </TabsTrigger>
                        <TabsTrigger value="discounts" className="gap-2 cursor-pointer">
                            Discounts
                        </TabsTrigger>
                    </TabsList>
                </div>

                <TabsContent value="fares" className="space-y-4">
                    <DataTable<FareConfig>
                        title="Distance-based Fares"
                        data={fares}
                        columns={fareColumns}
                        isLoading={isLoadingFares}
                        filterKey={"kilometer"}
                        onRefresh={fetchFares}
                        onAdd={openCreateFare}
                        onDeleteSelected={(rows) => askBulkDeleteFares(rows as FareConfig[])}
                    />
                </TabsContent>

                <TabsContent value="discounts" className="space-y-4">
                    <DataTable<DiscountConfig>
                        title="Passenger Discounts"
                        data={discounts}
                        columns={discountColumns}
                        isLoading={isLoadingDiscounts}
                        filterKey={"passengerType"}
                        onRefresh={fetchDiscounts}
                        onAdd={openCreateDiscount}
                        onDeleteSelected={(rows) => askBulkDeleteDiscounts(rows as DiscountConfig[])}
                    />
                </TabsContent>
            </Tabs>

            {/* ------------------------ Fare Create/Edit Dialog ------------------------ */}
            <Dialog open={fareDialogOpen} onOpenChange={setFareDialogOpen}>
                <DialogContent className="sm:max-w-[520px]">
                    <DialogHeader>
                        <DialogTitle>{fareEditing ? "Edit Fare Row" : "Add Fare Row"}</DialogTitle>
                        <DialogDescription>
                            Distance-based base fare. Bus Type is optional (label only).
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-2">
                        <div className="grid grid-cols-4 items-center gap-3">
                            <Label htmlFor="km" className="text-right">
                                Kilometer
                            </Label>
                            <Input
                                id="km"
                                type="number"
                                step="0.01"
                                value={fareForm.kilometer}
                                onChange={(e) => setFareForm((s) => ({ ...s, kilometer: e.target.value }))}
                                className="col-span-3"
                                placeholder="e.g. 10"
                            />
                        </div>
                        <div className="grid grid-cols-4 items-center gap-3">
                            <Label htmlFor="fare" className="text-right">
                                Fare (₱)
                            </Label>
                            <Input
                                id="fare"
                                type="number"
                                step="0.01"
                                value={fareForm.fare}
                                onChange={(e) => setFareForm((s) => ({ ...s, fare: e.target.value }))}
                                className="col-span-3"
                                placeholder="e.g. 25"
                            />
                        </div>
                        <div className="grid grid-cols-4 items-center gap-3">
                            <Label htmlFor="bt" className="text-right">
                                Bus Type
                            </Label>
                            <Input
                                id="bt"
                                value={fareForm.busType}
                                onChange={(e) => setFareForm((s) => ({ ...s, busType: e.target.value }))}
                                className="col-span-3"
                                placeholder='Optional label like "Aircon"'
                            />
                        </div>
                        <div className="grid grid-cols-4 items-center gap-3">
                            <Label htmlFor="desc" className="text-right">
                                Description
                            </Label>
                            <Input
                                id="desc"
                                value={fareForm.description}
                                onChange={(e) => setFareForm((s) => ({ ...s, description: e.target.value }))}
                                className="col-span-3"
                                placeholder="Optional note"
                            />
                        </div>
                        <div className="grid grid-cols-4 items-center gap-3">
                            <Label className="text-right">Active</Label>
                            <div className="col-span-3">
                                <Switch
                                    className="cursor-pointer"
                                    checked={fareForm.active}
                                    onCheckedChange={(v) => setFareForm((s) => ({ ...s, active: !!v }))}
                                />
                            </div>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button
                            variant="outline"
                            className="cursor-pointer"
                            onClick={() => setFareDialogOpen(false)}
                        >
                            Cancel
                        </Button>
                        <Button onClick={saveFare} disabled={fareSaving} className="text-white cursor-pointer">
                            {fareSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                            Save
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* ---------------------- Discount Create/Edit Dialog --------------------- */}
            <Dialog open={discountDialogOpen} onOpenChange={setDiscountDialogOpen}>
                <DialogContent className="sm:max-w-[520px] bg-black">
                    <DialogHeader>
                        <DialogTitle>{discountEditing ? "Edit Discount" : "Add Discount"}</DialogTitle>
                        <DialogDescription>Passenger-type discount in percent (0–100).</DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-2">
                        <div className="grid grid-cols-4 items-center gap-3">
                            <Label htmlFor="ptype" className="text-right">
                                Passenger Type
                            </Label>
                            <Input
                                id="ptype"
                                value={discountForm.passengerType}
                                onChange={(e) => setDiscountForm((s) => ({ ...s, passengerType: e.target.value }))}
                                className="col-span-3"
                                placeholder='e.g. "Student"'
                            />
                        </div>
                        <div className="grid grid-cols-4 items-center gap-3">
                            <Label htmlFor="pct" className="text-right">
                                Discount %
                            </Label>
                            <Input
                                id="pct"
                                type="number"
                                step="0.01"
                                value={discountForm.discountPercentage}
                                onChange={(e) =>
                                    setDiscountForm((s) => ({ ...s, discountPercentage: e.target.value }))
                                }
                                className="col-span-3"
                                placeholder="e.g. 20"
                            />
                        </div>
                        <div className="grid grid-cols-4 items-center gap-3">
                            <Label htmlFor="ddesc" className="text-right">
                                Description
                            </Label>
                            <Input
                                id="ddesc"
                                value={discountForm.description}
                                onChange={(e) => setDiscountForm((s) => ({ ...s, description: e.target.value }))}
                                className="col-span-3"
                                placeholder="Optional note"
                            />
                        </div>
                        <div className="grid grid-cols-4 items-center gap-3">
                            <Label className="text-right">Active</Label>
                            <div className="col-span-3">
                                <Switch
                                    className="cursor-pointer"
                                    checked={discountForm.active}
                                    onCheckedChange={(v) => setDiscountForm((s) => ({ ...s, active: !!v }))}
                                />
                            </div>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button
                            variant="outline"
                            className="cursor-pointer"
                            onClick={() => setDiscountDialogOpen(false)}
                        >
                            Cancel
                        </Button>
                        <Button
                            onClick={saveDiscount}
                            disabled={discountSaving}
                            className="text-white cursor-pointer"
                        >
                            {discountSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                            Save
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* ------------------------ Emerald Alert Dialog ------------------------- */}
            <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
                <AlertDialogContent className="bg-emerald-600 text-white border-emerald-700">
                    <AlertDialogHeader>
                        <AlertDialogTitle>Confirm Delete</AlertDialogTitle>
                        <AlertDialogDescription className="text-emerald-50">
                            {confirmKind === "fare"
                                ? "This will permanently delete the selected fare row."
                                : confirmKind === "discount"
                                    ? "This will permanently delete the selected discount."
                                    : "This will permanently delete all selected items."}
                            <br />
                            <span className="font-semibold">Item{confirmKind.endsWith("bulk") ? "s" : ""}:</span>{" "}
                            {confirmName}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel className="bg-white/10 hover:bg-white/20 text-white border-white/20 cursor-pointer">
                            Cancel
                        </AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleConfirmDelete}
                            className="bg-white text-emerald-700 hover:bg-emerald-50 cursor-pointer"
                        >
                            Delete
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    )
}
