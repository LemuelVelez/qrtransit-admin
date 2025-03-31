"use client"

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { MapPin } from "lucide-react"

interface TopRoutesTableProps {
  routes: {
    route: string
    count: number
  }[]
}

export function TopRoutesTable({ routes }: TopRoutesTableProps) {
  return (
    <div className="rounded-md border overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="font-medium">Route</TableHead>
            <TableHead className="text-right font-medium">Tickets</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {routes.length === 0 ? (
            <TableRow>
              <TableCell colSpan={2} className="text-center py-6 text-muted-foreground">
                No route data available
              </TableCell>
            </TableRow>
          ) : (
            routes.map((route, index) => (
              <TableRow key={index}>
                <TableCell>
                  <div className="flex items-center">
                    <MapPin className="mr-2 h-4 w-4 text-sky-500" />
                    <span>{route.route}</span>
                  </div>
                </TableCell>
                <TableCell className="text-right">
                  <Badge variant="outline" className="bg-sky-50 text-sky-700 hover:bg-sky-100 border-sky-200">
                    {route.count}
                  </Badge>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  )
}

