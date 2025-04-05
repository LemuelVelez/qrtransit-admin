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
          <TableRow className="bg-primary hover:bg-primary/50 text-white">
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
              <TableRow key={index} className="hover:bg-primary/50">
                <TableCell>
                  <div className="flex items-center">
                    <MapPin className="mr-2 h-4 w-4 text-primary" />
                    <span>{route.route}</span>
                  </div>
                </TableCell>
                <TableCell className="text-right">
                  <Badge
                    variant="outline"
                    className="border-primary hover:bg-primary/90"
                  >
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

