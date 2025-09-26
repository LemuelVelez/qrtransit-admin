/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */
import { databases, config } from "./appwrite";
import { Query } from "appwrite";
import { getTripsCollectionId } from "./trips-service";
import { getRoutesCollectionId } from "./route-service";

// Interface for bus data with conductor and revenue information
export interface BusWithConductor {
  id: string;
  busNumber: string;
  conductorId: string;
  conductorName: string;
  route: string;
  qrRevenue: number;
  cashRevenue: number;
  totalRevenue: number;
  cashRemitted: boolean;
  remittanceStatus: "remitted" | "pending" | "none";
  remittanceAmount?: number;
  remittanceNotes?: string;
  remittanceTimestamp?: number;
  revenueId?: string; // Added to track revenue cycles
  verificationTimestamp?: number; // Added to track when verified
}

// Collection ID for cash remittance records
const getCashRemittanceCollectionId = () => {
  return process.env.NEXT_PUBLIC_APPWRITE_CASH_REMITTANCE_COLLECTION_ID || "";
};

// Collection ID for users
const getUsersCollectionId = () => {
  return process.env.NEXT_PUBLIC_APPWRITE_USERS_COLLECTION_ID || "";
};

// ---- internal: fetch all with pagination (cursor, then offset fallback) ----
async function listAllDocuments(
  databaseId: string,
  collectionId: string,
  baseQueries: string[] = [],
  batchSize = 200,
  maxPages = 1000
) {
  try {
    const all: any[] = [];
    let cursor: string | null = null;

    for (let page = 0; page < maxPages; page++) {
      const queries = [...baseQueries, Query.limit(batchSize)];
      if (cursor) queries.push(Query.cursorAfter(cursor));

      const res = await databases.listDocuments(databaseId, collectionId, queries);
      if (res.documents.length === 0) break;

      all.push(...res.documents);
      if (res.documents.length < batchSize) break;

      cursor = res.documents[res.documents.length - 1].$id;
    }

    return all;
  } catch {
    const all: any[] = [];
    for (let page = 0; page < maxPages; page++) {
      const offset = page * batchSize;
      const res = await databases.listDocuments(databaseId, collectionId, [
        ...baseQueries,
        Query.limit(batchSize),
        Query.offset(offset),
      ]);
      if (res.documents.length === 0) break;
      all.push(...res.documents);
      if (res.documents.length < batchSize) break;
    }
    return all;
  }
}

/**
 * Get buses with their conductors and revenue information for a specific date range
 * (uses unlimited, batched reads under the hood to avoid API strain)
 *
 * FIX: Preserve/restore route info for entries sourced from remittances-only by
 * hydrating from the most recent route (within a safe buffer) or from trips.
 */
export async function getBusesWithConductors(
  startDate?: Date,
  endDate?: Date
): Promise<BusWithConductor[]> {
  try {
    const databaseId = config.databaseId!;
    const routesCollectionId = getRoutesCollectionId();
    const tripsCollectionId = getTripsCollectionId();
    const remittanceCollectionId = getCashRemittanceCollectionId();
    const usersCollectionId = getUsersCollectionId();

    if (!databaseId || !routesCollectionId || !tripsCollectionId || !usersCollectionId) {
      throw new Error("Appwrite configuration missing");
    }

    if (!startDate) startDate = new Date();
    if (!endDate) endDate = new Date();

    const startTimestamp = startDate.getTime().toString();
    const endTimestamp = new Date(endDate.setHours(23, 59, 59, 999)).getTime().toString();

    // 1) Get all routes in range (batched) – base source of buses
    const routesInRange = await listAllDocuments(databaseId, routesCollectionId, [
      Query.greaterThanEqual("timestamp", startTimestamp),
      Query.lessThanEqual("timestamp", endTimestamp),
    ]);

    // Build bus map from routes
    const busMap = new Map<string, BusWithConductor>();
    const conductorIds = new Set<string>();

    for (const route of routesInRange) {
      const busKey = `${route.busNumber}-${route.conductorId}`;
      conductorIds.add(route.conductorId);

      if (!busMap.has(busKey)) {
        busMap.set(busKey, {
          id: route.$id,
          busNumber: route.busNumber,
          conductorId: route.conductorId,
          conductorName: "Unknown Conductor",
          route: `${route.from} → ${route.to}`,
          qrRevenue: 0,
          cashRevenue: 0,
          totalRevenue: 0,
          cashRemitted: false,
          remittanceStatus: "none",
        });
      }
    }

    // 2) Bring in remittances within range and ensure those buses exist in the map
    //    (keeps "today's remitted" visible even without a fresh route today)
    const remittancesInRange = await listAllDocuments(databaseId, remittanceCollectionId, [
      Query.greaterThanEqual("timestamp", startTimestamp),
      Query.lessThanEqual("timestamp", endTimestamp),
    ]);

    for (const rem of remittancesInRange) {
      const busKey = `${rem.busNumber}-${rem.conductorId}`;
      conductorIds.add(rem.conductorId);

      if (!busMap.has(busKey)) {
        // Create a minimal row from the remittance record; route will be hydrated later
        busMap.set(busKey, {
          id: rem.busId || rem.$id,
          busNumber: rem.busNumber,
          conductorId: rem.conductorId,
          conductorName: rem.conductorName || "Unknown Conductor",
          route: "", // <-- will hydrate below
          qrRevenue: 0,
          cashRevenue: 0,
          totalRevenue: 0,
          cashRemitted: rem.status === "remitted",
          remittanceStatus: rem.status || "pending",
          remittanceAmount: rem.amount ? Number.parseFloat(rem.amount) : undefined,
          remittanceNotes: rem.notes || "",
          remittanceTimestamp: rem.timestamp ? Number.parseInt(rem.timestamp) : undefined,
          revenueId: rem.revenueId || "",
          verificationTimestamp: rem.verificationTimestamp ? Number.parseInt(rem.verificationTimestamp) : undefined,
        });
      }
    }

    // 3) Batch-fetch conductors to avoid N queries (up to 100 values per equal)
    const conductorIdList = Array.from(conductorIds);
    const conductorCache = new Map<string, { firstName: string; lastName: string }>();

    for (let i = 0; i < conductorIdList.length; i += 100) {
      const slice = conductorIdList.slice(i, i + 100);
      const usersRes = await listAllDocuments(databaseId, usersCollectionId, [
        Query.equal("userId", slice),
        Query.equal("role", "conductor"),
      ]);

      for (const user of usersRes) {
        conductorCache.set(user.userId, {
          firstName: user.firstname || "",
          lastName: user.lastname || "",
        });
      }
    }

    // Apply conductor names when missing
    for (const [, busData] of busMap.entries()) {
      if (!busData.conductorName || busData.conductorName === "Unknown Conductor") {
        const info = conductorCache.get(busData.conductorId);
        if (info) {
          busData.conductorName = `${info.firstName} ${info.lastName}`.trim() || "Unknown Conductor";
        }
      }
    }

    // 4) Hydrate missing route values:
    //    - Try latest route for the same bus+conductor within a 7-day buffer window.
    //    - Fallback: infer from any trip in the selected range.
    const missingRouteKeys = Array.from(busMap.entries())
      .filter(([, v]) => !v.route || v.route.trim() === "" || v.route === "—")
      .map(([k]) => k);

    if (missingRouteKeys.length > 0) {
      const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;
      const bufferStartTs = Math.max(0, Number(startTimestamp) - sevenDaysMs).toString();

      // Fetch recent routes in buffered window (batched)
      const recentRoutes = await listAllDocuments(databaseId, routesCollectionId, [
        Query.greaterThanEqual("timestamp", bufferStartTs),
        Query.lessThanEqual("timestamp", endTimestamp),
      ]);

      // Index the latest route per busKey
      const latestRouteByKey = new Map<string, any>();
      for (const r of recentRoutes) {
        const key = `${r.busNumber}-${r.conductorId}`;
        if (!missingRouteKeys.includes(key)) continue;
        const prev = latestRouteByKey.get(key);
        if (!prev || Number(r.timestamp) > Number(prev.timestamp)) {
          latestRouteByKey.set(key, r);
        }
      }

      // Apply from latest routes
      for (const key of missingRouteKeys) {
        const item = latestRouteByKey.get(key);
        if (item) {
          const bus = busMap.get(key)!;
          bus.route = `${item.from} → ${item.to}`;
        }
      }
    }

    // 5) Build remittance cutoff per conductor (latest 'remitted' prior to or on endTimestamp)
    const remittedAll = await listAllDocuments(databaseId, remittanceCollectionId, [
      Query.equal("status", "remitted"),
      Query.lessThanEqual("verificationTimestamp", endTimestamp),
    ]);

    const cutoffByConductor = new Map<string, string>();
    for (const rem of remittedAll) {
      const cId = rem.conductorId;
      const cur = cutoffByConductor.get(cId);
      if (!cur || Number(rem.verificationTimestamp || "0") > Number(cur)) {
        cutoffByConductor.set(cId, rem.verificationTimestamp || "0");
      }
    }
    // default cutoff "0" if none
    for (const [, busData] of busMap.entries()) {
      if (!cutoffByConductor.has(busData.conductorId)) {
        cutoffByConductor.set(busData.conductorId, "0");
      }
    }

    // 6) Fetch ALL trips in date range once (batched), then distribute to buses
    const tripsAll = await listAllDocuments(databaseId, tripsCollectionId, [
      Query.greaterThanEqual("timestamp", startTimestamp),
      Query.lessThanEqual("timestamp", endTimestamp),
    ]);

    // If any route still missing, try setting from a trip
    const stillMissingRoute = new Set(
      Array.from(busMap.entries())
        .filter(([, v]) => !v.route || v.route.trim() === "" || v.route === "—")
        .map(([k]) => k)
    );

    for (const trip of tripsAll) {
      const key = `${trip.busNumber}-${trip.conductorId}`;
      if (!busMap.has(key)) continue;

      // Try to fill route from first available trip for this key
      if (stillMissingRoute.has(key) && trip.from && trip.to) {
        const bus = busMap.get(key)!;
        bus.route = `${trip.from} → ${trip.to}`;
        stillMissingRoute.delete(key);
      }
    }

    // Now compute revenue (after cutoff)
    for (const trip of tripsAll) {
      const key = `${trip.busNumber}-${trip.conductorId}`;
      if (!busMap.has(key)) continue;

      const cutoff = Number(cutoffByConductor.get(trip.conductorId) || "0");
      const ts = Number(trip.timestamp);
      if (ts <= cutoff) continue; // only after last remittance

      const fare = Number.parseFloat(String(trip.fare).replace(/[^\d.-]/g, "")) || 0;
      const bus = busMap.get(key)!;
      bus.totalRevenue += fare;
      if (trip.paymentMethod === "QR") bus.qrRevenue += fare;
      else bus.cashRevenue += fare;
    }

    // 7) Determine the latest remittance per bus within the selected range and apply status/details
    const latestRemittanceMap = new Map<string, any>();
    for (const rem of remittancesInRange) {
      const busKey = `${rem.busNumber}-${rem.conductorId}`;
      const prev = latestRemittanceMap.get(busKey);
      if (!prev || Number(rem.timestamp) > Number(prev.timestamp)) {
        latestRemittanceMap.set(busKey, rem);
      }
    }

    for (const [busKey, remittance] of latestRemittanceMap.entries()) {
      if (!busMap.has(busKey)) continue;
      const busData = busMap.get(busKey)!;
      busData.remittanceStatus = remittance.status || "pending";
      busData.cashRemitted = remittance.status === "remitted";
      busData.remittanceAmount = Number.parseFloat(remittance.amount ?? "0") || 0;
      busData.remittanceNotes = remittance.notes || "";
      busData.remittanceTimestamp = Number.parseInt(remittance.timestamp) || 0;
      busData.revenueId = remittance.revenueId || "";
      if (remittance.verificationTimestamp) {
        busData.verificationTimestamp = Number.parseInt(remittance.verificationTimestamp) || 0;
      }
    }

    // Final fallback for any remaining missing route
    for (const [, busData] of busMap.entries()) {
      if (!busData.route || busData.route.trim() === "") {
        busData.route = "Unknown route";
      }
    }

    return Array.from(busMap.values());
  } catch (error) {
    console.error("Error fetching buses with conductors:", error);
    return [];
  }
}

/**
 * Update cash remittance status for a bus
 */
export async function updateCashRemittanceStatus(
  busId: string,
  remitted: boolean,
  amount: number,
  notes: string
): Promise<boolean> {
  try {
    const databaseId = config.databaseId!;
    const remittanceCollectionId = getCashRemittanceCollectionId();
    const routesCollectionId = getRoutesCollectionId();
    const usersCollectionId = getUsersCollectionId();

    if (!databaseId || !remittanceCollectionId || !routesCollectionId || !usersCollectionId) {
      throw new Error("Appwrite configuration missing");
    }

    const busDetails = await databases.getDocument(databaseId, routesCollectionId, busId);

    // Conductor details
    let conductorName = "Unknown Conductor";
    try {
      const usersResponse = await databases.listDocuments(databaseId, usersCollectionId, [
        Query.equal("userId", busDetails.conductorId),
        Query.equal("role", "conductor"),
        Query.limit(1),
      ]);
      if (usersResponse.documents.length > 0) {
        const user = usersResponse.documents[0];
        conductorName = `${user.firstname || ""} ${user.lastname || ""}`.trim() || "Unknown Conductor";
      }
    } catch (error) {
      console.error(`Error fetching conductor details:`, error);
    }

    // Find last remittance record for this bus
    const existingRemittanceResponse = await databases.listDocuments(databaseId, remittanceCollectionId, [
      Query.equal("busId", busId),
      Query.equal("conductorId", busDetails.conductorId),
      Query.orderDesc("timestamp"),
      Query.limit(1),
    ]);

    const timestamp = Date.now().toString();
    const remittanceData: Record<string, any> = {
      busId,
      busNumber: busDetails.busNumber,
      conductorId: busDetails.conductorId,
      conductorName,
      amount: amount.toString(),
      notes,
      timestamp,
      status: remitted ? "remitted" : "pending",
      ...(remitted ? { verificationTimestamp: timestamp } : {}),
    };

    if (existingRemittanceResponse.documents.length > 0) {
      const existing = existingRemittanceResponse.documents[0];
      remittanceData.revenueId =
        existing.revenueId ||
        `rev_${Date.now()}_${Math.floor(Math.random() * 9999)
          .toString()
          .padStart(4, "0")}`;

      await databases.updateDocument(databaseId, remittanceCollectionId, existing.$id, remittanceData);
    } else {
      remittanceData.revenueId = `rev_${Date.now()}_${Math.floor(Math.random() * 9999)
        .toString()
        .padStart(4, "0")}`;
      await databases.createDocument(databaseId, remittanceCollectionId, "unique()", remittanceData);
    }

    return true;
  } catch (error) {
    console.error("Error updating cash remittance status:", error);
    return false;
  }
}

/**
 * Verify a pending remittance
 */
export async function verifyRemittance(remittanceId: string): Promise<boolean> {
  try {
    const databaseId = config.databaseId!;
    const remittanceCollectionId = getCashRemittanceCollectionId();
    if (!databaseId || !remittanceCollectionId) throw new Error("Appwrite configuration missing");

    const verificationTimestamp = Date.now().toString();

    await databases.updateDocument(databaseId, remittanceCollectionId, remittanceId, {
      status: "remitted",
      verificationTimestamp,
    });

    return true;
  } catch (error) {
    console.error("Error verifying remittance:", error);
    return false;
  }
}

/**
 * Get all remittances for a specific bus and conductor (unlimited, batched)
 */
export async function getRemittanceHistory(
  busId: string,
  conductorId: string,
  startDate?: Date,
  endDate?: Date
): Promise<any[]> {
  try {
    const databaseId = config.databaseId!;
    const remittanceCollectionId = getCashRemittanceCollectionId();
    if (!databaseId || !remittanceCollectionId) throw new Error("Appwrite configuration missing");

    if (!startDate) {
      startDate = new Date();
      startDate.setDate(startDate.getDate() - 30);
    }
    if (!endDate) endDate = new Date();

    const startTimestamp = startDate.getTime().toString();
    const endTimestamp = new Date(endDate.setHours(23, 59, 59, 999)).getTime().toString();

    const docs = await listAllDocuments(databaseId, remittanceCollectionId, [
      Query.equal("busId", busId),
      Query.equal("conductorId", conductorId),
      Query.greaterThanEqual("timestamp", startTimestamp),
      Query.lessThanEqual("timestamp", endTimestamp),
    ]);

    const items = docs.map((doc) => ({
      id: doc.$id,
      busId: doc.busId,
      busNumber: doc.busNumber,
      conductorId: doc.conductorId,
      conductorName: doc.conductorName,
      status: doc.status,
      amount: Number.parseFloat(doc.amount) || 0,
      notes: doc.notes || "",
      timestamp: Number.parseInt(doc.timestamp) || 0,
      revenueId: doc.revenueId || "",
      verificationTimestamp: doc.verificationTimestamp ? Number.parseInt(doc.verificationTimestamp) : undefined,
    }));
    items.sort((a, b) => b.timestamp - a.timestamp);
    return items;
  } catch (error) {
    console.error("Error fetching remittance history:", error);
    return [];
  }
}

/**
 * Reset revenue after remittance is verified (placeholder)
 */
export async function resetRevenueAfterRemittance(_conductorId: string): Promise<boolean> {
  try {
    return true;
  } catch (error) {
    console.error("Error resetting revenue:", error);
    return false;
  }
}
