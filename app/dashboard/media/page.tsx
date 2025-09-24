/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { storage, config } from "@/lib/appwrite";
import { Query } from "appwrite";
import {
    Card,
    CardContent,
    CardDescription,
    CardFooter,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { Trash2, RefreshCw, Eye, Image as ImageIcon } from "lucide-react";
import { cn, formatDate } from "@/lib/utils";

type BucketKey = "avatar" | "passenger";

const BUCKETS: Record<BucketKey, { id?: string; label: string; helper: string }> = {
    avatar: {
        id: config.avatarBucketId,
        label: "Avatar Photos",
        helper: "Profile avatars uploaded by users/admins.",
    },
    passenger: {
        id: config.passengerPhotoBucketId,
        label: "Passenger Photos",
        helper: "Passenger snapshots linked to trips/tickets.",
    },
};

const PAGE_SIZE = 24;

function formatBytes(bytes?: number): string {
    if (!bytes || bytes <= 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB", "TB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`;
}

// Prefer full view URL so actual images render; fall back to preview on error.
function filePreviewUrl(bucketId: string, fileId: string, size = 512): string {
    return storage.getFilePreview(bucketId, fileId, size, size).toString();
}
function fileViewUrl(bucketId: string, fileId: string): string {
    return storage.getFileView(bucketId, fileId).toString();
}

export default function MediaManagerPage() {
    const [activeTab, setActiveTab] = useState<BucketKey>("avatar");
    const [isLoading, setIsLoading] = useState(false);
    const [files, setFiles] = useState<any[]>([]);
    const [page, setPage] = useState(0);
    const [hasMore, setHasMore] = useState(false);
    const [filter, setFilter] = useState("");

    const bucketId = useMemo(() => BUCKETS[activeTab].id || "", [activeTab]);

    const filteredFiles = useMemo(() => {
        if (!filter.trim()) return files;
        const q = filter.toLowerCase();
        return files.filter(
            (f) =>
                (f.name || "").toLowerCase().includes(q) ||
                (f.mimeType || "").toLowerCase().includes(q) ||
                (f.$id || "").toLowerCase().includes(q)
        );
    }, [files, filter]);

    const loadFiles = useCallback(async (which: BucketKey, pageIndex = 0) => {
        if (!BUCKETS[which].id) return;
        setIsLoading(true);
        try {
            const res = await storage.listFiles(BUCKETS[which].id!, [
                Query.limit(PAGE_SIZE + 1),
                Query.offset(pageIndex * PAGE_SIZE),
                Query.orderDesc("$createdAt"),
            ]);
            const list = (res.files || []) as any[];
            setHasMore(list.length > PAGE_SIZE);
            setFiles(list.slice(0, PAGE_SIZE));
        } catch (e) {
            console.error("Error listing files:", e);
            setFiles([]);
            setHasMore(false);
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        setPage(0);
        loadFiles(activeTab, 0);
    }, [activeTab, loadFiles]);

    const refresh = async () => {
        setPage(0);
        await loadFiles(activeTab, 0);
    };

    const handleDelete = async (fileId: string) => {
        if (!bucketId) return;
        const ok = confirm("Delete this file permanently?");
        if (!ok) return;
        try {
            await storage.deleteFile(bucketId, fileId);
            setFiles((prev) => prev.filter((f) => f.$id !== fileId));
        } catch (err) {
            console.error("Delete error:", err);
            alert("Failed to delete file.");
        }
    };

    const nextPage = async () => {
        const newPage = page + 1;
        setPage(newPage);
        await loadFiles(activeTab, newPage);
    };
    const prevPage = async () => {
        if (page === 0) return;
        const newPage = page - 1;
        setPage(newPage);
        await loadFiles(activeTab, newPage);
    };

    const BucketPanel = ({ bucketKey }: { bucketKey: BucketKey }) => {
        const bucket = BUCKETS[bucketKey];
        const isActive = activeTab === bucketKey;
        const showFiles = isActive ? filteredFiles : [];

        return (
            <Card>
                <CardHeader className="gap-3">
                    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                        <div className="min-w-0">
                            <CardTitle>{bucket.label}</CardTitle>
                            <CardDescription>{bucket.helper}</CardDescription>
                        </div>

                        {/* Controls: vertical on mobile, horizontal on sm+ */}
                        <div className="flex w-full sm:w-auto flex-col sm:flex-row items-stretch sm:items-center gap-2">
                            <Input
                                placeholder="Filter by name, type, or ID..."
                                value={filter}
                                onChange={(e) => setFilter(e.target.value)}
                                className="w-full sm:w-[260px]"
                            />
                            <Button variant="outline" onClick={refresh} disabled={isLoading} className="w-full sm:w-auto">
                                <RefreshCw className={cn("mr-2 h-4 w-4", isLoading && "animate-spin")} />
                                Refresh
                            </Button>
                        </div>
                    </div>
                </CardHeader>

                <CardContent>
                    {!bucket.id ? (
                        <div className="text-sm text-muted-foreground">
                            Missing environment variable for this bucket. Please set{" "}
                            {bucketKey === "avatar"
                                ? "NEXT_PUBLIC_APPWRITE_AVATAR_BUCKET_ID"
                                : "NEXT_PUBLIC_APPWRITE_PASSENGER_PHOTO_BUCKET_ID"}
                            .
                        </div>
                    ) : isLoading ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-4">
                            {Array.from({ length: 12 }).map((_, i) => (
                                <Card key={i} className="overflow-hidden">
                                    <Skeleton className="h-40 w-full" />
                                    <CardFooter className="p-3">
                                        <Skeleton className="h-4 w-3/4" />
                                    </CardFooter>
                                </Card>
                            ))}
                        </div>
                    ) : showFiles.length === 0 ? (
                        <div className="text-sm text-muted-foreground">No files found.</div>
                    ) : (
                        <ScrollArea className="w-full">
                            {/* Single column on mobile (vertical), multi-col on larger screens */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-4 pr-2">
                                {showFiles.map((f) => {
                                    const viewUrl = fileViewUrl(bucket.id!, f.$id);
                                    const previewUrl = filePreviewUrl(bucket.id!, f.$id, 512);

                                    return (
                                        <Card key={f.$id} className="overflow-hidden">
                                            <div className="aspect-square bg-muted/40 flex items-center justify-center">
                                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                                <img
                                                    src={viewUrl}
                                                    alt={f.name}
                                                    className="h-full w-full object-cover"
                                                    loading="lazy"
                                                    onError={(e) => {
                                                        if (e.currentTarget.src !== previewUrl) {
                                                            e.currentTarget.src = previewUrl;
                                                        }
                                                    }}
                                                />
                                            </div>

                                            <CardHeader className="p-3 pb-1">
                                                <div className="flex items-center gap-2">
                                                    <ImageIcon className="h-4 w-4 text-primary" />
                                                    <span className="text-sm font-medium truncate" title={f.name}>
                                                        {f.name}
                                                    </span>
                                                </div>
                                                <CardDescription className="text-xs">
                                                    {formatBytes(f.sizeOriginal || f.size)} • {f.mimeType || "image/*"}
                                                </CardDescription>
                                            </CardHeader>

                                            {/* Vertical actions layout (mobile-first) */}
                                            <CardFooter className="p-3 pt-1 flex flex-col gap-2">
                                                <div className="text-[11px] text-muted-foreground">{formatDate(f.$createdAt)}</div>
                                                <div className="flex flex-col gap-2 w-full">
                                                    <Button
                                                        size="sm"
                                                        variant="secondary"
                                                        className="h-9 w-full"
                                                        onClick={() => window.open(viewUrl, "_blank", "noopener,noreferrer")}
                                                    >
                                                        <Eye className="mr-2 h-4 w-4" />
                                                        View
                                                    </Button>
                                                    <Button
                                                        size="sm"
                                                        variant="destructive"
                                                        className="h-9 w-full cursor-pointer"
                                                        onClick={() => handleDelete(f.$id)}
                                                    >
                                                        <Trash2 className="mr-2 h-4 w-4" />
                                                        Delete
                                                    </Button>
                                                </div>
                                            </CardFooter>
                                        </Card>
                                    );
                                })}
                            </div>
                        </ScrollArea>
                    )}
                </CardContent>

                {/* Pagination: vertical on mobile */}
                <CardFooter className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <div className="text-xs text-muted-foreground">
                        Page {page + 1}
                        {hasMore ? " (more available)" : ""}
                    </div>
                    <div className="flex w-full sm:w-auto gap-2">
                        <Button
                            variant="outline"
                            onClick={prevPage}
                            disabled={isLoading || page === 0}
                            className="flex-1 sm:flex-none"
                        >
                            Prev
                        </Button>
                        <Button
                            variant="outline"
                            onClick={nextPage}
                            disabled={isLoading || !hasMore}
                            className="flex-1 sm:flex-none"
                        >
                            Next
                        </Button>
                    </div>
                </CardFooter>
            </Card>
        );
    };

    return (
        <div className="flex flex-col gap-4">
            {/* Header: vertical on mobile */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <h1 className="text-2xl text-center sm:text-3xl font-bold tracking-tight">Media Manager</h1>
            </div>

            <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as BucketKey)} className="space-y-4">
                <div className="w-full overflow-x-auto pb-2">
                    <TabsList>
                        <TabsTrigger value="avatar" className="w-full sm:w-auto">Avatar Bucket</TabsTrigger>
                        <TabsTrigger value="passenger" className="w-full sm:w-auto">Passenger Photos Bucket</TabsTrigger>
                    </TabsList>
                </div>

                <TabsContent value="avatar" className="space-y-4">
                    <BucketPanel bucketKey="avatar" />
                </TabsContent>

                <TabsContent value="passenger" className="space-y-4">
                    <BucketPanel bucketKey="passenger" />
                </TabsContent>
            </Tabs>
        </div>
    );
}
