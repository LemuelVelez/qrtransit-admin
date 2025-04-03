/* eslint-disable @typescript-eslint/no-explicit-any */
"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { Search, Loader2 } from "lucide-react"
import { ScrollArea } from "@/components/ui/scroll-area"
import { getAllRoutes, updateRouteStatus } from "@/lib/route-service"
import { formatDate } from "@/lib/utils"

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
            <div className="rounded-md border">
              <ScrollArea className="w-full" orientation="horizontal">
                <Table className="w-full">
                  <TableHeader>
                    <TableRow>
                      <TableHead className="min-w-[150px]">Route</TableHead>
                      <TableHead className="min-w-[80px]">Bus #</TableHead>
                      <TableHead className="min-w-[120px]">Conductor</TableHead>
                      <TableHead className="min-w-[100px]">Created</TableHead>
                      <TableHead className="min-w-[100px]">Status</TableHead>
                      <TableHead className="min-w-[80px] text-right">Active</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredRoutes.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                          No routes found
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredRoutes.map((route) => (
                        <TableRow key={route.id}>
                          <TableCell className="font-medium truncate max-w-[150px]">
                            {route.from} → {route.to}
                          </TableCell>
                          <TableCell>{route.busNumber}</TableCell>
                          <TableCell className="truncate max-w-[120px]">{route.conductorName || "Unknown"}</TableCell>
                          <TableCell>{formatDate(route.timestamp)}</TableCell>
                          <TableCell>
                            <Badge variant={route.active ? "default" : "secondary"}>
                              {route.active ? "Active" : "Inactive"}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <Switch
                              checked={route.active}
                              disabled={updatingRouteId === route.id}
                              onCheckedChange={() => handleToggleRouteStatus(route.id, route.active)}
                            />
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </ScrollArea>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

