/* eslint-disable @typescript-eslint/no-explicit-any */
"use client"

import { useState, useEffect, useMemo } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { Search, Loader2 } from "lucide-react"
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area"
import { getAllRoutes, updateRouteStatus } from "@/lib/route-service"
import { formatDate, cn } from "@/lib/utils"

// DataTable components
import { type ColumnDef, flexRender, getCoreRowModel, useReactTable } from "@tanstack/react-table"

export default function RoutesPage() {
  const [routes, setRoutes] = useState<any[]>([])
  const [filteredRoutes, setFilteredRoutes] = useState<any[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [isLoading, setIsLoading] = useState(true)
  const [updatingRouteId, setUpdatingRouteId] = useState<string | null>(null)

  useEffect(() => {
    const fetchRoutes = async () => {
      setIsLoading(true)
      try {
        const routesData = await getAllRoutes()
        setRoutes(routesData)
        setFilteredRoutes(routesData)
      } catch (error) {
        console.error("Error fetching routes:", error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchRoutes()
  }, [])

  useEffect(() => {
    if (searchQuery.trim() === "") {
      setFilteredRoutes(routes)
    } else {
      const query = searchQuery.toLowerCase()
      const filtered = routes.filter(
        (route) =>
          route.from.toLowerCase().includes(query) ||
          route.to.toLowerCase().includes(query) ||
          route.busNumber.toLowerCase().includes(query) ||
          route.conductorName?.toLowerCase().includes(query),
      )
      setFilteredRoutes(filtered)
    }
  }, [searchQuery, routes])

  const handleToggleRouteStatus = async (routeId: string, currentStatus: boolean) => {
    setUpdatingRouteId(routeId)
    try {
      const success = await updateRouteStatus(routeId, !currentStatus)

      if (success) {
        // Update local state
        setRoutes(routes.map((route) => (route.id === routeId ? { ...route, active: !currentStatus } : route)))

        setFilteredRoutes(
          filteredRoutes.map((route) => (route.id === routeId ? { ...route, active: !currentStatus } : route)),
        )
      }
    } catch (error) {
      console.error("Error updating route status:", error)
    } finally {
      setUpdatingRouteId(null)
    }
  }

  // Define columns for DataTable
  const columns = useMemo<ColumnDef<any>[]>(
    () => [
      {
        accessorKey: "route",
        header: "Route",
        cell: ({ row }) => {
          const route = row.original
          const routeText = `${route.from} → ${route.to}`
          return (
            <div className="min-w-[150px] max-w-[250px]">
              <ScrollArea className="h-[40px] w-full" type="always">
                <div className="pr-4 font-medium">{routeText}</div>
                <ScrollBar orientation="horizontal" />
              </ScrollArea>
            </div>
          )
        },
      },
      {
        accessorKey: "busNumber",
        header: "Bus #",
        cell: ({ row }) => <div>{row.original.busNumber}</div>,
      },
      {
        accessorKey: "conductorName",
        header: "Conductor",
        cell: ({ row }) => <div className="max-w-[120px] truncate">{row.original.conductorName || "Unknown"}</div>,
      },
      {
        accessorKey: "timestamp",
        header: "Created",
        cell: ({ row }) => <div>{formatDate(row.original.timestamp)}</div>,
      },
      {
        accessorKey: "status",
        header: "Status",
        cell: ({ row }) => (
          <Badge
            className={cn(
              row.original.active
                ? "bg-emerald-600 hover:bg-emerald-700 text-white"
                : "bg-slate-700 hover:bg-slate-800 text-white",
            )}
          >
            {row.original.active ? "Active" : "Inactive"}
          </Badge>
        ),
      },
      {
        accessorKey: "active",
        header: () => <div className="text-right">Active</div>,
        cell: ({ row }) => (
          <div className="text-right">
            <Switch
              checked={row.original.active}
              disabled={updatingRouteId === row.original.id}
              onCheckedChange={() => handleToggleRouteStatus(row.original.id, row.original.active)}
              className={cn(
                "data-[state=checked]:bg-emerald-600",
                "data-[state=unchecked]:bg-slate-200",
                "data-[state=checked]:border-emerald-700",
                "transition-colors",
              )}
            />
          </div>
        ),
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [updatingRouteId],
  )

  // Initialize the table
  const table = useReactTable({
    data: filteredRoutes,
    columns,
    getCoreRowModel: getCoreRowModel(),
  })

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Routes</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Active Routes</CardTitle>
          <CardDescription>Manage bus routes and their status</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between mb-4">
            <div className="relative max-w-sm">
              <Search className="absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search routes..."
                className="pl-8"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>

          {isLoading ? (
            <div className="flex justify-center items-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
            <div className="rounded-md border overflow-hidden">
              <ScrollArea className="h-[400px]">
                <div className="min-w-[800px]">
                  <table className="w-full caption-bottom text-sm">
                    <thead className="[&_tr]:border-b sticky top-0 z-10 bg-slate-100 dark:bg-slate-800">
                      {table.getHeaderGroups().map((headerGroup) => (
                        <tr key={headerGroup.id} className="border-b transition-colors">
                          {headerGroup.headers.map((header) => (
                            <th
                              key={header.id}
                              className="h-12 px-4 text-left align-middle font-medium text-slate-700 dark:text-slate-300 [&:has([role=checkbox])]:pr-0"
                            >
                              {header.isPlaceholder
                                ? null
                                : flexRender(header.column.columnDef.header, header.getContext())}
                            </th>
                          ))}
                        </tr>
                      ))}
                    </thead>
                    <tbody className="[&_tr:last-child]:border-0">
                      {table.getRowModel().rows?.length ? (
                        table.getRowModel().rows.map((row) => (
                          <tr
                            key={row.id}
                          
                          >
                            {row.getVisibleCells().map((cell) => (
                              <td key={cell.id} className="p-4 align-middle [&:has([role=checkbox])]:pr-0">
                                {flexRender(cell.column.columnDef.cell, cell.getContext())}
                              </td>
                            ))}
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={columns.length} className="h-24 text-center">
                            No routes found
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
                <ScrollBar orientation="horizontal" />
              </ScrollArea>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

