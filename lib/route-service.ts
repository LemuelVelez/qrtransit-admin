import { Query } from "appwrite";
import { databases, config } from "./appwrite";

export interface RouteInfo {
  id?: string;
  from: string;
  to: string;
  busNumber: string;
  timestamp: number;
  active?: boolean;
  conductorName?: string;
  conductorId: string;
}

// Get the collection ID for routes
const getRoutesCollectionId = () => {
  return process.env.NEXT_PUBLIC_APPWRITE_ROUTES_COLLECTION_ID || "";
};

// Get all routes
export async function getAllRoutes(): Promise<RouteInfo[]> {
  try {
    const databaseId = config.databaseId;
    const collectionId = getRoutesCollectionId();

    if (!databaseId || !collectionId) {
      throw new Error("Appwrite configuration missing");
    }

    const response = await databases.listDocuments(databaseId, collectionId, [
      Query.orderDesc("timestamp"),
    ]);

    return response.documents.map((route) => ({
      id: route.$id,
      from: route.from,
      to: route.to,
      busNumber: route.busNumber,
      timestamp: Number.parseInt(route.timestamp),
      active: route.active === true,
      conductorName: route.conductorName || "",
      conductorId: route.conductorId,
    }));
  } catch (error) {
    console.error("Error getting all routes:", error);
    return [];
  }
}

// Get active routes
export async function getActiveRoutes(): Promise<RouteInfo[]> {
  try {
    const databaseId = config.databaseId;
    const collectionId = getRoutesCollectionId();

    if (!databaseId || !collectionId) {
      throw new Error("Appwrite configuration missing");
    }

    const response = await databases.listDocuments(databaseId, collectionId, [
      Query.equal("active", true),
      Query.orderDesc("timestamp"),
    ]);

    return response.documents.map((route) => ({
      id: route.$id,
      from: route.from,
      to: route.to,
      busNumber: route.busNumber,
      timestamp: Number.parseInt(route.timestamp),
      active: route.active === true,
      conductorName: route.conductorName || "",
      conductorId: route.conductorId,
    }));
  } catch (error) {
    console.error("Error getting active routes:", error);
    return [];
  }
}

// Get routes by bus number
export async function getRoutesByBusNumber(
  busNumber: string
): Promise<RouteInfo[]> {
  try {
    const databaseId = config.databaseId;
    const collectionId = getRoutesCollectionId();

    if (!databaseId || !collectionId) {
      throw new Error("Appwrite configuration missing");
    }

    const response = await databases.listDocuments(databaseId, collectionId, [
      Query.equal("busNumber", busNumber),
      Query.orderDesc("timestamp"),
    ]);

    return response.documents.map((route) => ({
      id: route.$id,
      from: route.from,
      to: route.to,
      busNumber: route.busNumber,
      timestamp: Number.parseInt(route.timestamp),
      active: route.active === true,
      conductorName: route.conductorName || "",
      conductorId: route.conductorId,
    }));
  } catch (error) {
    console.error("Error getting routes by bus number:", error);
    return [];
  }
}

// Update route status (active/inactive)
export async function updateRouteStatus(
  routeId: string,
  active: boolean
): Promise<boolean> {
  try {
    const databaseId = config.databaseId;
    const collectionId = getRoutesCollectionId();

    if (!databaseId || !collectionId) {
      throw new Error("Appwrite configuration missing");
    }

    // Only update the active status without endTimestamp to fix the Appwrite error
    await databases.updateDocument(databaseId, collectionId, routeId, {
      active: active,
    });

    return true;
  } catch (error) {
    console.error("Error updating route status:", error);
    return false;
  }
}
