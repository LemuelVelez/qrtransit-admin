import { Skeleton } from "@/components/ui/skeleton"
import { Card, CardContent, CardHeader } from "@/components/ui/card"

export default function Loading() {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <Skeleton className="h-8 w-[300px]" />
      </div>

      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-[220px] mb-2" />
          <Skeleton className="h-4 w-[280px]" />
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <Skeleton className="h-10 w-full sm:w-[300px]" />
              <Skeleton className="h-10 w-full sm:w-[300px]" />
            </div>

            <div className="rounded-md border overflow-x-auto">
              <div className="h-10 border-b bg-muted/50 px-4 flex items-center gap-4">
                <Skeleton className="h-4 w-[100px]" />
                <Skeleton className="h-4 w-[80px]" />
                <Skeleton className="h-4 w-[60px]" />
                <Skeleton className="h-4 w-[60px]" />
                <Skeleton className="h-4 w-[120px]" />
                <Skeleton className="h-4 w-[80px]" />
                <Skeleton className="h-4 w-[60px]" />
                <Skeleton className="h-4 w-[60px]" />
              </div>
              {Array(5)
                .fill(0)
                .map((_, i) => (
                  <div key={i} className="border-b last:border-0">
                    <div className="px-4 py-3 flex items-center gap-4">
                      <Skeleton className="h-4 w-[100px]" />
                      <Skeleton className="h-4 w-[80px]" />
                      <Skeleton className="h-4 w-[60px]" />
                      <Skeleton className="h-4 w-[60px]" />
                      <Skeleton className="h-4 w-[120px]" />
                      <Skeleton className="h-4 w-[80px]" />
                      <Skeleton className="h-6 w-[60px]" />
                      <Skeleton className="h-8 w-[60px]" />
                    </div>
                  </div>
                ))}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

