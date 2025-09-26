/* eslint-disable @typescript-eslint/no-explicit-any */
import { Query } from "appwrite"
import { databases, config } from "@/lib/appwrite"

/** Shape of an inspection record shown in the dashboard */
export type InspectionRecord = {
  id: string
  inspectorId: string
  inspectorName?: string
  busId: string
  busNumber: string
  conductorId: string
  conductorName: string
  timestamp: string
  inspectionFrom: string
  inspectionTo: string
  passengerCount: string
  status: string
}

/** Helper to verify env presence for this page */
export const envHasInspectionsCollection = () =>
  !!process.env.NEXT_PUBLIC_APPWRITE_INSPECTIONS_COLLECTION_ID

const getDb = () => {
  if (!config.databaseId)
    throw new Error("Missing NEXT_PUBLIC_APPWRITE_DATABASE_ID")
  return config.databaseId as string
}

const getInspectionsCol = () => {
  const id = process.env.NEXT_PUBLIC_APPWRITE_INSPECTIONS_COLLECTION_ID
  if (!id)
    throw new Error("Missing NEXT_PUBLIC_APPWRITE_INSPECTIONS_COLLECTION_ID")
  return id
}

const getUsersCol = () => {
  // optional; used to resolve inspector names when available
  return config.usersCollectionId || process.env.NEXT_PUBLIC_APPWRITE_USERS_COLLECTION_ID || ""
}

/** Internal: list all with robust pagination */
async function listAllDocuments(
  databaseId: string,
  collectionId: string,
  baseQueries: any[] = [],
  batchSize = 100,
  maxBatches = 100
): Promise<any[]> {
  const out: any[] = []
  let cursor: string | null = null

  for (let i = 0; i < maxBatches; i++) {
    const queries: any[] = [Query.limit(Math.min(Math.max(batchSize, 1), 100))]
    if (cursor) queries.push(Query.cursorAfter(cursor))
    queries.push(...baseQueries)

    const res = await databases.listDocuments(databaseId, collectionId, queries)
    const docs: any[] = res?.documents ?? []
    out.push(...docs)

    if (docs.length < (queries.find((q: any) => typeof q?.limit === "number")?.limit ?? batchSize)) break
    cursor = docs[docs.length - 1].$id
  }

  return out
}

/** Try to resolve inspector names from the Users collection (optional enrichment). */
async function enrichInspectorNames(rows: InspectionRecord[]): Promise<InspectionRecord[]> {
  const usersCol = getUsersCol()
  const db = getDb()
  if (!usersCol) return rows

  // Collect unique inspectorIds
  const ids = Array.from(new Set(rows.map((r) => r.inspectorId).filter(Boolean)))
  if (ids.length === 0) return rows

  // Appwrite supports equal with an array; chunk to be safe (<=100 per call)
  const chunkSize = 100
  const userMap = new Map<string, { firstname?: string; lastname?: string; username?: string; email?: string }>()
  for (let i = 0; i < ids.length; i += chunkSize) {
    const batch = ids.slice(i, i + chunkSize)
    try {
      const res = await databases.listDocuments(db, usersCol, [Query.equal("userId", batch)])
      for (const u of (res?.documents ?? []) as any[]) {
        userMap.set(String(u.userId), {
          firstname: u.firstname,
          lastname: u.lastname,
          username: u.username,
          email: u.email,
        })
      }
    } catch {
      // ignore enrichment failures gracefully
    }
  }

  return rows.map((r) => {
    const u = userMap.get(r.inspectorId)
    if (!u) return r
    const name =
      (u.firstname || u.lastname) ? `${u.firstname || ""} ${u.lastname || ""}`.trim()
      : (u.username || u.email || undefined)
    return { ...r, inspectorName: name }
  })
}

/**
 * List inspections from the Appwrite collection.
 * By default we return only 'cleared' records (as requested for history), most-recent first,
 * and enrich with inspector names if the Users collection is configured.
 */
export async function listInspections(opts?: {
  onlyCleared?: boolean
  enrichInspectorNames?: boolean
}): Promise<InspectionRecord[]> {
  const db = getDb()
  const col = getInspectionsCol()

  const queries: any[] = [Query.orderDesc("timestamp")]
  if (opts?.onlyCleared) queries.push(Query.equal("status", "cleared"))

  const docs = await listAllDocuments(db, col, queries, 100, 100)

  const rows: InspectionRecord[] = (docs as any[]).map((d) => ({
    id: String(d.$id),
    inspectorId: String(d.inspectorId || ""),
    inspectorName: undefined, // filled later (optional)
    busId: String(d.busId || ""),
    busNumber: String(d.busNumber || ""),
    conductorId: String(d.conductorId || ""),
    conductorName: String(d.conductorName || "Unknown Conductor"),
    timestamp: String(d.timestamp || Date.now().toString()),
    inspectionFrom: String(d.inspectionFrom || ""),
    inspectionTo: String(d.inspectionTo || ""),
    passengerCount: String(d.passengerCount ?? ""),
    status: String(d.status || "cleared"),
  }))

  if (opts?.enrichInspectorNames !== false) {
    return await enrichInspectorNames(rows)
  }
  return rows
}
