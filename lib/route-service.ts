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
export const getRoutesCollectionId = () => {
  return process.env.NEXT_PUBLIC_APPWRITE_ROUTES_COLLECTION_ID || "";
};

// Get the collection ID for users
export const getUsersCollectionId = () => {
  return process.env.NEXT_PUBLIC_APPWRITE_USERS_COLLECTION_ID || "";
};

// Get conductor information by ID
export async function getConductorById(
  conductorId: string
): Promise<{ name: string; role: string } | null> {
  try {
    const databaseId = config.databaseId;
    const collectionId = getUsersCollectionId();

    if (!databaseId || !collectionId) {
      throw new Error("Appwrite configuration missing");
    }

    // Query for users where userId matches the conductorId
    const response = await databases.listDocuments(databaseId, collectionId, [
      Query.equal("userId", conductorId),
    ]);

    // Check if we found a matching user
    if (response.documents.length > 0) {
      const user = response.documents[0];

      if (user && user.role === "conductor") {
        return {
          name: `${user.firstname} ${user.lastname}`.trim(),
          role: user.role,
        };
      }
    }

    return null;
  } catch (error) {
    console.error("Error getting conductor information:", error);
    return null;
  }
}

// Get all routes with conductor information
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

    const routes = response.documents.map((route) => ({
      id: route.$id,
      from: route.from,
      to: route.to,
      busNumber: route.busNumber,
      timestamp: Number.parseInt(route.timestamp),
      active: route.active === true,
      conductorName: route.conductorName || "",
      conductorId: route.conductorId,
    }));

    // Fetch conductor information for routes with missing conductor names
    const routesWithConductors = await Promise.all(
      routes.map(async (route) => {
        if (!route.conductorName && route.conductorId) {
          const conductorInfo = await getConductorById(route.conductorId);
          if (conductorInfo) {
            return {
              ...route,
              conductorName: conductorInfo.name,
            };
          }
        }
        return route;
      })
    );

    return routesWithConductors;
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

    const routes = response.documents.map((route) => ({
      id: route.$id,
      from: route.from,
      to: route.to,
      busNumber: route.busNumber,
      timestamp: Number.parseInt(route.timestamp),
      active: route.active === true,
      conductorName: route.conductorName || "",
      conductorId: route.conductorId,
    }));

    // Fetch conductor information for routes with missing conductor names
    const routesWithConductors = await Promise.all(
      routes.map(async (route) => {
        if (!route.conductorName && route.conductorId) {
          const conductorInfo = await getConductorById(route.conductorId);
          if (conductorInfo) {
            return {
              ...route,
              conductorName: conductorInfo.name,
            };
          }
        }
        return route;
      })
    );

    return routesWithConductors;
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

    const routes = response.documents.map((route) => ({
      id: route.$id,
      from: route.from,
      to: route.to,
      busNumber: route.busNumber,
      timestamp: Number.parseInt(route.timestamp),
      active: route.active === true,
      conductorName: route.conductorName || "",
      conductorId: route.conductorId,
    }));

    // Fetch conductor information for routes with missing conductor names
    const routesWithConductors = await Promise.all(
      routes.map(async (route) => {
        if (!route.conductorName && route.conductorId) {
          const conductorInfo = await getConductorById(route.conductorId);
          if (conductorInfo) {
            return {
              ...route,
              conductorName: conductorInfo.name,
            };
          }
        }
        return route;
      })
    );

    return routesWithConductors;
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
