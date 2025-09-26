/* eslint-disable @typescript-eslint/no-explicit-any */
// lib/trips-service.ts
import { databases, config } from "./appwrite";
import { Query } from "appwrite";

export interface Trip {
  id: string;
  passengerName: string;
  fare: string;
  from: string;
  to: string;
  timestamp: number;
  paymentMethod: string;
  transactionId: string;
  conductorId: string;
  passengerPhoto?: string;
  passengerType?: string;
  kilometer?: string;
  totalTrips?: string;
  totalPassengers?: string;
  totalRevenue?: string;
  busNumber?: string;
}

// Get the collection ID for trips
export const getTripsCollectionId = () => {
  return process.env.NEXT_PUBLIC_APPWRITE_TRIPS_COLLECTION_ID || "";
};

// ---- internal: fetch all with pagination (cursor, then offset fallback) ----
async function listAllDocuments(
  databaseId: string,
  collectionId: string,
  baseQueries: string[] = [],
  batchSize = 100,
  maxPages = 1000
) {
  // Try cursor-based pagination first (preferred)
  try {
    const all: any[] = [];
    let cursor: string | null = null;

    for (let page = 0; page < maxPages; page++) {
      const queries = [...baseQueries, Query.limit(batchSize)];
      if (cursor) queries.push(Query.cursorAfter(cursor));

      const res = await databases.listDocuments(
        databaseId,
        collectionId,
        queries
      );
      if (res.documents.length === 0) break;

      all.push(...res.documents);
      if (res.documents.length < batchSize) break;

      cursor = res.documents[res.documents.length - 1].$id;
    }

    return all;
  } catch {
    // Fallback to offset-based pagination
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

const mapTrip = (doc: any): Trip => ({
  id: doc.$id,
  passengerName: doc.passengerName || "Unknown Passenger",
  fare: doc.fare || "₱0.00",
  from: doc.from || "Unknown",
  to: doc.to || "Unknown",
  timestamp: Number.parseInt(doc.timestamp) || Date.now(),
  paymentMethod: doc.paymentMethod || "QR",
  transactionId: doc.transactionId || "0000000000",
  conductorId: doc.conductorId,
  passengerPhoto: doc.passengerPhoto,
  passengerType: doc.passengerType,
  kilometer: doc.kilometer,
  totalTrips: doc.totalTrips,
  totalPassengers: doc.totalPassengers,
  totalRevenue: doc.totalRevenue,
  busNumber: doc.busNumber || "",
});

// Get all trips (unlimited, controlled batching)
export async function getAllTrips(): Promise<Trip[]> {
  try {
    const databaseId = config.databaseId!;
    const collectionId = getTripsCollectionId();
    if (!databaseId || !collectionId)
      throw new Error("Appwrite configuration missing");

    const docs = await listAllDocuments(databaseId, collectionId);
    const trips = docs.map(mapTrip);
    // consistent newest-first ordering
    trips.sort((a, b) => b.timestamp - a.timestamp);
    return trips;
  } catch (error) {
    console.error("Error getting all trips:", error);
    return [];
  }
}

// Get trips by date range (unlimited, controlled batching)
export async function getTripsByDateRange(
  startDate: Date,
  endDate: Date,
  conductorId?: string
): Promise<Trip[]> {
  try {
    const databaseId = config.databaseId!;
    const collectionId = getTripsCollectionId();
    if (!databaseId || !collectionId)
      throw new Error("Appwrite configuration missing");

    const startTimestamp = startDate.getTime().toString();
    const endTimestamp = endDate.setHours(23, 59, 59, 999).toString();

    const baseQueries = [
      Query.greaterThanEqual("timestamp", startTimestamp),
      Query.lessThanEqual("timestamp", endTimestamp),
    ];
    if (conductorId) baseQueries.push(Query.equal("conductorId", conductorId));

    const docs = await listAllDocuments(databaseId, collectionId, baseQueries);
    const trips = docs.map(mapTrip);
    trips.sort((a, b) => b.timestamp - a.timestamp);
    return trips;
  } catch (error) {
    console.error("Error getting trips by date range:", error);
    return [];
  }
}

// Get trips by bus number (unlimited, controlled batching)
export async function getTripsByBusNumber(busNumber: string): Promise<Trip[]> {
  try {
    const databaseId = config.databaseId!;
    const collectionId = getTripsCollectionId();
    if (!databaseId || !collectionId)
      throw new Error("Appwrite configuration missing");

    const docs = await listAllDocuments(databaseId, collectionId, [
      Query.equal("busNumber", busNumber),
    ]);
    const trips = docs.map(mapTrip);
    trips.sort((a, b) => b.timestamp - a.timestamp);
    return trips;
  } catch (error) {
    console.error("Error getting trips by bus number:", error);
    return [];
  }
}

// Get trips by route (unlimited, controlled batching)
export async function getTripsByRoute(
  from: string,
  to: string
): Promise<Trip[]> {
  try {
    const databaseId = config.databaseId!;
    const collectionId = getTripsCollectionId();
    if (!databaseId || !collectionId)
      throw new Error("Appwrite configuration missing");

    const docs = await listAllDocuments(databaseId, collectionId, [
      Query.equal("from", from),
      Query.equal("to", to),
    ]);
    const trips = docs.map(mapTrip);
    trips.sort((a, b) => b.timestamp - a.timestamp);
    return trips;
  } catch (error) {
    console.error("Error getting trips by route:", error);
    return [];
  }
}

// Get analytics data (uses unlimited paginated fetch under the hood)
export async function getAnalyticsData(startDate?: Date, endDate?: Date) {
  try {
    const databaseId = config.databaseId!;
    const collectionId = getTripsCollectionId();
    if (!databaseId || !collectionId)
      throw new Error("Appwrite configuration missing");

    if (!startDate || !endDate) {
      endDate = new Date();
      startDate = new Date();
      startDate.setDate(endDate.getDate() - 30);
    }

    const currentPeriodDuration = endDate.getTime() - startDate.getTime();
    const previousPeriodEndDate = new Date(startDate.getTime() - 1);
    const previousPeriodStartDate = new Date(
      previousPeriodEndDate.getTime() - currentPeriodDuration
    );

    const currentPeriodData = await getAnalyticsForPeriod(
      databaseId,
      collectionId,
      startDate,
      endDate
    );
    const previousPeriodData = await getAnalyticsForPeriod(
      databaseId,
      collectionId,
      previousPeriodStartDate,
      previousPeriodEndDate
    );

    const pct = (cur: number, prev: number) =>
      prev === 0 ? (cur > 0 ? 100 : 0) : ((cur - prev) / prev) * 100;

    return {
      ...currentPeriodData,
      revenueChange: pct(
        currentPeriodData.totalRevenue,
        previousPeriodData.totalRevenue
      ),
      tripsChange: pct(
        currentPeriodData.totalTrips,
        previousPeriodData.totalTrips
      ),
      qrRevenueChange: pct(
        currentPeriodData.qrRevenue,
        previousPeriodData.qrRevenue
      ),
      cashRevenueChange: pct(
        currentPeriodData.cashRevenue,
        previousPeriodData.cashRevenue
      ),
    };
  } catch (error) {
    console.error("Error getting analytics data:", error);
    throw error;
  }
}

// Helper function to get analytics for a specific period (unlimited fetch)
async function getAnalyticsForPeriod(
  databaseId: string,
  collectionId: string,
  startDate: Date,
  endDate: Date
) {
  try {
    const startTimestamp = startDate.getTime().toString();
    const endTimestamp = new Date(endDate.getTime())
      .setHours(23, 59, 59, 999)
      .toString();

    const docs = await listAllDocuments(databaseId, collectionId, [
      Query.greaterThanEqual("timestamp", startTimestamp),
      Query.lessThanEqual("timestamp", endTimestamp),
    ]);

    let totalRevenue = 0;
    let cashRevenue = 0;
    let qrRevenue = 0;
    const routeCounts: Record<string, number> = {};
    const busCounts: Record<string, number> = {};
    const conductorCounts: Record<string, number> = {};
    const dailyRevenue: Record<string, number> = {};

    docs.forEach((trip: any) => {
      const fare =
        Number.parseFloat(String(trip.fare).replace(/[^\d.-]/g, "")) || 0;
      totalRevenue += fare;

      if (trip.paymentMethod === "QR") qrRevenue += fare;
      else cashRevenue += fare;

      const route = `${trip.from} → ${trip.to}`;
      routeCounts[route] = (routeCounts[route] || 0) + 1;

      if (trip.busNumber)
        busCounts[trip.busNumber] = (busCounts[trip.busNumber] || 0) + 1;
      if (trip.conductorId)
        conductorCounts[trip.conductorId] =
          (conductorCounts[trip.conductorId] || 0) + 1;

      const day = new Date(Number(trip.timestamp)).toISOString().split("T")[0];
      dailyRevenue[day] = (dailyRevenue[day] || 0) + fare;
    });

    const totalTrips = docs.length;

    const topRoutes = Object.entries(routeCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([route, count]) => ({ route, count }));

    const topBuses = Object.entries(busCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([busNumber, count]) => ({ busNumber, count }));

    const dailyRevenueData = Object.entries(dailyRevenue)
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([date, amount]) => ({ date, amount }));

    return {
      totalRevenue,
      cashRevenue,
      qrRevenue,
      totalTrips,
      topRoutes,
      topBuses,
      dailyRevenueData,
    };
  } catch (error) {
    console.error("Error getting analytics for period:", error);
    return {
      totalRevenue: 0,
      cashRevenue: 0,
      qrRevenue: 0,
      totalTrips: 0,
      topRoutes: [],
      topBuses: [],
      dailyRevenueData: [],
    };
  }
}
