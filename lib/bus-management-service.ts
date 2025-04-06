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
  remittanceAmount?: number;
  remittanceNotes?: string;
  remittanceTimestamp?: number;
}

// Collection ID for cash remittance records
const getCashRemittanceCollectionId = () => {
  return process.env.NEXT_PUBLIC_APPWRITE_CASH_REMITTANCE_COLLECTION_ID || "";
};

/**
 * Get buses with their conductors and revenue information for a specific date range
 */
export async function getBusesWithConductors(
  startDate?: Date,
  endDate?: Date
): Promise<BusWithConductor[]> {
  try {
    const databaseId = config.databaseId;
    const routesCollectionId = getRoutesCollectionId();
    const tripsCollectionId = getTripsCollectionId();
    const remittanceCollectionId = getCashRemittanceCollectionId();

    if (!databaseId || !routesCollectionId || !tripsCollectionId) {
      throw new Error("Appwrite configuration missing");
    }

    // Default to today if no dates provided
    if (!startDate) startDate = new Date();
    if (!endDate) endDate = new Date();

    // Convert dates to timestamps (as strings)
    const startTimestamp = startDate.getTime().toString();
    const endTimestamp = new Date(endDate.setHours(23, 59, 59, 999))
      .getTime()
      .toString();

    // 1. Get all active routes/buses for the date range
    const routesResponse = await databases.listDocuments(
      databaseId,
      routesCollectionId,
      [
        Query.greaterThanEqual("timestamp", startTimestamp),
        Query.lessThanEqual("timestamp", endTimestamp),
        Query.orderDesc("timestamp"),
      ]
    );

    // Create a map to store unique bus-conductor combinations
    const busMap = new Map<string, BusWithConductor>();

    // Process routes to get unique bus-conductor combinations
    for (const route of routesResponse.documents) {
      const busKey = `${route.busNumber}-${route.conductorId}`;

      if (!busMap.has(busKey)) {
        busMap.set(busKey, {
          id: route.$id,
          busNumber: route.busNumber,
          conductorId: route.conductorId,
          conductorName: route.conductorName || "Unknown Conductor",
          route: `${route.from} → ${route.to}`,
          qrRevenue: 0,
          cashRevenue: 0,
          totalRevenue: 0,
          cashRemitted: false,
        });
      }
    }

    // 2. Get all trips for these buses in the date range
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    for (const [busKey, busData] of busMap.entries()) {
      const tripsResponse = await databases.listDocuments(
        databaseId,
        tripsCollectionId,
        [
          Query.equal("conductorId", busData.conductorId),
          Query.equal("busNumber", busData.busNumber),
          Query.greaterThanEqual("timestamp", startTimestamp),
          Query.lessThanEqual("timestamp", endTimestamp),
        ]
      );

      // Calculate revenue from trips
      for (const trip of tripsResponse.documents) {
        const fare = Number.parseFloat(trip.fare.replace(/[^\d.-]/g, "")) || 0;

        busData.totalRevenue += fare;

        if (trip.paymentMethod === "QR") {
          busData.qrRevenue += fare;
        } else {
          busData.cashRevenue += fare;
        }
      }
    }

    // 3. Check cash remittance status
    try {
      const remittanceResponse = await databases.listDocuments(
        databaseId,
        remittanceCollectionId,
        [
          Query.greaterThanEqual("timestamp", startTimestamp),
          Query.lessThanEqual("timestamp", endTimestamp),
        ]
      );

      // Update remittance status for buses
      for (const remittance of remittanceResponse.documents) {
        const busKey = `${remittance.busNumber}-${remittance.conductorId}`;

        if (busMap.has(busKey)) {
          const busData = busMap.get(busKey)!;
          busData.cashRemitted = remittance.status === "remitted";
          busData.remittanceAmount = Number.parseFloat(remittance.amount) || 0;
          busData.remittanceNotes = remittance.notes || "";
          busData.remittanceTimestamp =
            Number.parseInt(remittance.timestamp) || 0;
        }
      }
    } catch (error) {
      console.error("Error fetching remittance data:", error);
      // Continue without remittance data if there's an error
    }

    // Convert map to array and return
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
    const databaseId = config.databaseId;
    const remittanceCollectionId = getCashRemittanceCollectionId();
    const routesCollectionId = getRoutesCollectionId();

    if (!databaseId || !remittanceCollectionId || !routesCollectionId) {
      throw new Error("Appwrite configuration missing");
    }

    // Get bus details
    const busDetails = await databases.getDocument(
      databaseId,
      routesCollectionId,
      busId
    );

    // Check if there's an existing remittance record
    const existingRemittanceResponse = await databases.listDocuments(
      databaseId,
      remittanceCollectionId,
      [Query.equal("busId", busId), Query.limit(1)]
    );

    const timestamp = Date.now().toString();
    const remittanceData = {
      busId: busId,
      busNumber: busDetails.busNumber,
      conductorId: busDetails.conductorId,
      conductorName: busDetails.conductorName || "Unknown Conductor",
      status: remitted ? "remitted" : "pending",
      amount: amount.toString(),
      notes: notes,
      timestamp: timestamp,
    };

    if (existingRemittanceResponse.documents.length > 0) {
      // Update existing record
      const existingRemittance = existingRemittanceResponse.documents[0];
      await databases.updateDocument(
        databaseId,
        remittanceCollectionId,
        existingRemittance.$id,
        remittanceData
      );
    } else {
      // Create new record
      await databases.createDocument(
        databaseId,
        remittanceCollectionId,
        "unique()",
        remittanceData
      );
    }

    return true;
  } catch (error) {
    console.error("Error updating cash remittance status:", error);
    return false;
  }
}
