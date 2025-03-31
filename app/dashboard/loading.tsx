import { Skeleton } from "@/components/ui/skeleton"

export default function Loading() {
    return (
        <div className="flex flex-col max-w-full gap-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <Skeleton className="h-8 w-[150px]" />
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 w-full sm:w-auto">
                    <Skeleton className="h-10 w-full sm:w-[250px]" />
                    <Skeleton className="h-10 w-full sm:w-[100px]" />
                </div>
            </div>

            <div className="space-y-4">
                {/* Stats Cards */}
                <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
                    {Array(4)
                        .fill(0)
                        .map((_, i) => (
                            <Skeleton key={i} className="h-[120px] w-full rounded-lg animate-pulse-emerald" />
                        ))}
                </div>

                {/* Charts */}
                <div className="grid gap-4 grid-cols-1 lg:grid-cols-7">
                    <Skeleton className="col-span-full lg:col-span-4 h-[400px] rounded-lg animate-pulse-emerald" />
                    <Skeleton className="col-span-full lg:col-span-3 h-[400px] rounded-lg animate-pulse-emerald" />
                </div>

                {/* Tables */}
                <div className="grid gap-4 grid-cols-1 lg:grid-cols-7">
                    <Skeleton className="col-span-full lg:col-span-4 h-[400px] rounded-lg animate-pulse-emerald" />
                    <Skeleton className="col-span-full lg:col-span-3 h-[400px] rounded-lg animate-pulse-emerald" />
                </div>
            </div>
        </div>
    )
}

