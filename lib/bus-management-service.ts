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
    const usersCollectionId = getUsersCollectionId();

    if (
      !databaseId ||
      !routesCollectionId ||
      !tripsCollectionId ||
      !usersCollectionId
    ) {
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

    // Create a map to cache conductor information
    const conductorCache = new Map<
      string,
      { firstName: string; lastName: string }
    >();

    // Process routes to get unique bus-conductor combinations
    for (const route of routesResponse.documents) {
      const busKey = `${route.busNumber}-${route.conductorId}`;

      if (!busMap.has(busKey)) {
        busMap.set(busKey, {
          id: route.$id,
          busNumber: route.busNumber,
          conductorId: route.conductorId,
          conductorName: "Unknown Conductor", // Will be updated later
          route: `${route.from} → ${route.to}`,
          qrRevenue: 0,
          cashRevenue: 0,
          totalRevenue: 0,
          cashRemitted: false,
          remittanceStatus: "none",
        });
      }
    }

    // Fetch conductor information from users collection
    for (const [busKey, busData] of busMap.entries()) {
      if (!conductorCache.has(busData.conductorId)) {
        try {
          // Query the users collection to find the conductor by userId
          const usersResponse = await databases.listDocuments(
            databaseId,
            usersCollectionId,
            [
              Query.equal("userId", busData.conductorId),
              Query.equal("role", "conductor"),
              Query.limit(1),
            ]
          );

          if (usersResponse.documents.length > 0) {
            const user = usersResponse.documents[0];
            conductorCache.set(busData.conductorId, {
              firstName: user.firstname || "",
              lastName: user.lastname || "",
            });
          }
        } catch (error) {
          console.error(
            `Error fetching conductor ${busData.conductorId} details:`,
            error
          );
        }
      }

      // Update conductor name if found in cache
      if (conductorCache.has(busData.conductorId)) {
        const conductor = conductorCache.get(busData.conductorId)!;
        busData.conductorName =
          `${conductor.firstName} ${conductor.lastName}`.trim() ||
          "Unknown Conductor";
      }
    }

    // 3. Check cash remittance status and get cutoff timestamps
    const remittanceCutoffs = new Map<string, string>();
    try {
      // Get the latest remittance with status "remitted" for each conductor
      for (const [busKey, busData] of busMap.entries()) {
        const remittanceResponse = await databases.listDocuments(
          databaseId,
          remittanceCollectionId,
          [
            Query.equal("conductorId", busData.conductorId),
            Query.equal("status", "remitted"),
            Query.orderDesc("verificationTimestamp"),
            Query.limit(1),
          ]
        );

        if (remittanceResponse.documents.length > 0) {
          const latestRemittance = remittanceResponse.documents[0];
          remittanceCutoffs.set(
            busData.conductorId,
            latestRemittance.verificationTimestamp || "0"
          );
        } else {
          remittanceCutoffs.set(busData.conductorId, "0");
        }
      }
    } catch (error) {
      console.error("Error fetching remittance cutoffs:", error);
    }

    // 2. Get all trips for these buses in the date range
     
    for (const [busKey, busData] of busMap.entries()) {
      // Get the cutoff timestamp for this conductor
      const cutoffTimestamp = remittanceCutoffs.get(busData.conductorId) || "0";

      const tripsResponse = await databases.listDocuments(
        databaseId,
        tripsCollectionId,
        [
          Query.equal("conductorId", busData.conductorId),
          Query.equal("busNumber", busData.busNumber),
          Query.greaterThan("timestamp", cutoffTimestamp), // Only count trips after the latest remittance
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
      // First, get all remittances for the date range
      const remittanceResponse = await databases.listDocuments(
        databaseId,
        remittanceCollectionId,
        [
          Query.greaterThanEqual("timestamp", startTimestamp),
          Query.lessThanEqual("timestamp", endTimestamp),
          Query.orderDesc("timestamp"), // Get the most recent remittances first
        ]
      );

      // Create a map to track the latest remittance for each bus-conductor pair
      const latestRemittanceMap = new Map<string, any>();

      // Find the latest remittance for each bus-conductor pair
      for (const remittance of remittanceResponse.documents) {
        const busKey = `${remittance.busNumber}-${remittance.conductorId}`;

        if (
          !latestRemittanceMap.has(busKey) ||
          Number(remittance.timestamp) >
            Number(latestRemittanceMap.get(busKey).timestamp)
        ) {
          latestRemittanceMap.set(busKey, remittance);
        }
      }

      // Update remittance status for buses
      for (const [busKey, remittance] of latestRemittanceMap.entries()) {
        if (busMap.has(busKey)) {
          const busData = busMap.get(busKey)!;

          // Update remittance status based on the status field
          busData.remittanceStatus = remittance.status;
          busData.cashRemitted = remittance.status === "remitted";
          busData.remittanceAmount = Number.parseFloat(remittance.amount) || 0;
          busData.remittanceNotes = remittance.notes || "";
          busData.remittanceTimestamp =
            Number.parseInt(remittance.timestamp) || 0;
          busData.revenueId = remittance.revenueId || "";

          // Add verification timestamp if available
          if (remittance.verificationTimestamp) {
            busData.verificationTimestamp =
              Number.parseInt(remittance.verificationTimestamp) || 0;
          }
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
    const usersCollectionId = getUsersCollectionId();

    if (
      !databaseId ||
      !remittanceCollectionId ||
      !routesCollectionId ||
      !usersCollectionId
    ) {
      throw new Error("Appwrite configuration missing");
    }

    // Get bus details
    const busDetails = await databases.getDocument(
      databaseId,
      routesCollectionId,
      busId
    );

    // Get conductor details
    let conductorName = "Unknown Conductor";
    try {
      const usersResponse = await databases.listDocuments(
        databaseId,
        usersCollectionId,
        [
          Query.equal("userId", busDetails.conductorId),
          Query.equal("role", "conductor"),
          Query.limit(1),
        ]
      );

      if (usersResponse.documents.length > 0) {
        const user = usersResponse.documents[0];
        conductorName =
          `${user.firstname || ""} ${user.lastname || ""}`.trim() ||
          "Unknown Conductor";
      }
    } catch (error) {
      console.error(`Error fetching conductor details:`, error);
    }

    // Find the latest remittance record for this bus
    const existingRemittanceResponse = await databases.listDocuments(
      databaseId,
      remittanceCollectionId,
      [
        Query.equal("busId", busId),
        Query.equal("conductorId", busDetails.conductorId),
        Query.orderDesc("timestamp"),
        Query.limit(1),
      ]
    );

    const timestamp = Date.now().toString();

    // Prepare remittance data
    const remittanceData: Record<string, any> = {
      busId: busId,
      busNumber: busDetails.busNumber,
      conductorId: busDetails.conductorId,
      conductorName: conductorName,
      amount: amount.toString(),
      notes: notes,
      timestamp: timestamp,
    };

    // If verifying a remittance, set status to remitted and add verification timestamp
    if (remitted) {
      remittanceData.status = "remitted";
      remittanceData.verificationTimestamp = timestamp;
    } else {
      remittanceData.status = "pending";
    }

    if (existingRemittanceResponse.documents.length > 0) {
      // Update existing record
      const existingRemittance = existingRemittanceResponse.documents[0];

      // Preserve the revenueId if it exists
      if (existingRemittance.revenueId) {
        remittanceData.revenueId = existingRemittance.revenueId;
      } else {
        // Generate a new revenueId if one doesn't exist
        remittanceData.revenueId = `rev_${Date.now()}_${Math.floor(
          Math.random() * 9999
        )
          .toString()
          .padStart(4, "0")}`;
      }

      await databases.updateDocument(
        databaseId,
        remittanceCollectionId,
        existingRemittance.$id,
        remittanceData
      );
    } else {
      // Create new record with a new revenueId
      remittanceData.revenueId = `rev_${Date.now()}_${Math.floor(
        Math.random() * 9999
      )
        .toString()
        .padStart(4, "0")}`;

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

/**
 * Verify a pending remittance
 */
export async function verifyRemittance(remittanceId: string): Promise<boolean> {
  try {
    const databaseId = config.databaseId;
    const remittanceCollectionId = getCashRemittanceCollectionId();

    if (!databaseId || !remittanceCollectionId) {
      throw new Error("Appwrite configuration missing");
    }

    const verificationTimestamp = Date.now().toString();

    // Get the remittance to find the conductorId
    const remittance = await databases.getDocument(
      databaseId,
      remittanceCollectionId,
      remittanceId
    );

    // Update the remittance status to remitted
    await databases.updateDocument(
      databaseId,
      remittanceCollectionId,
      remittanceId,
      {
        status: "remitted",
        verificationTimestamp: verificationTimestamp,
      }
    );

    return true;
  } catch (error) {
    console.error("Error verifying remittance:", error);
    return false;
  }
}

/**
 * Get all remittances for a specific bus and conductor
 */
export async function getRemittanceHistory(
  busId: string,
  conductorId: string,
  startDate?: Date,
  endDate?: Date
): Promise<any[]> {
  try {
    const databaseId = config.databaseId;
    const remittanceCollectionId = getCashRemittanceCollectionId();

    if (!databaseId || !remittanceCollectionId) {
      throw new Error("Appwrite configuration missing");
    }

    // Default to last 30 days if no dates provided
    if (!startDate) {
      startDate = new Date();
      startDate.setDate(startDate.getDate() - 30);
    }
    if (!endDate) endDate = new Date();

    // Convert dates to timestamps (as strings)
    const startTimestamp = startDate.getTime().toString();
    const endTimestamp = new Date(endDate.setHours(23, 59, 59, 999))
      .getTime()
      .toString();

    const queries = [
      Query.equal("busId", busId),
      Query.equal("conductorId", conductorId),
      Query.greaterThanEqual("timestamp", startTimestamp),
      Query.lessThanEqual("timestamp", endTimestamp),
      Query.orderDesc("timestamp"),
    ];

    const response = await databases.listDocuments(
      databaseId,
      remittanceCollectionId,
      queries
    );

    return response.documents.map((doc) => ({
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
      verificationTimestamp: doc.verificationTimestamp
        ? Number.parseInt(doc.verificationTimestamp)
        : undefined,
    }));
  } catch (error) {
    console.error("Error fetching remittance history:", error);
    return [];
  }
}

/**
 * Reset revenue after remittance is verified
 * This is a placeholder function since we don't have a "remitted" field
 * The actual reset happens by using the verification timestamp as a cutoff
 * in the revenue calculations
 * @param conductorId The ID of the conductor
 * @returns Whether the reset was successful
 */
export async function resetRevenueAfterRemittance(
  conductorId: string
): Promise<boolean> {
  try {
    // Since we don't have a "remitted" field in the trips collection,
    // we'll use the verification timestamp as a cutoff point
    // This is handled in the revenue calculations
    return true;
  } catch (error) {
    console.error("Error resetting revenue:", error);
    return false;
  }
}
