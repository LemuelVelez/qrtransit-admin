/* eslint-disable @typescript-eslint/no-explicit-any */
// lib/route-service.ts
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

// ---- internal: fetch all with pagination (cursor, then offset fallback) ----
async function listAllDocuments(
  databaseId: string,
  collectionId: string,
  baseQueries: string[] = [],
  batchSize = 100,
  maxPages = 1000
) {
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

// Get conductor information by ID
export async function getConductorById(
  conductorId: string
): Promise<{ name: string; role: string } | null> {
  try {
    const databaseId = config.databaseId!;
    const collectionId = getUsersCollectionId();
    if (!databaseId || !collectionId)
      throw new Error("Appwrite configuration missing");

    const response = await databases.listDocuments(databaseId, collectionId, [
      Query.equal("userId", conductorId),
      Query.limit(1),
    ]);

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

const mapRoute = (route: any): RouteInfo => ({
  id: route.$id,
  from: route.from,
  to: route.to,
  busNumber: route.busNumber,
  timestamp: Number.parseInt(route.timestamp),
  active: route.active === true,
  conductorName: route.conductorName || "",
  conductorId: route.conductorId,
});

// Get all routes (unlimited, controlled batching)
export async function getAllRoutes(): Promise<RouteInfo[]> {
  try {
    const databaseId = config.databaseId!;
    const collectionId = getRoutesCollectionId();
    if (!databaseId || !collectionId)
      throw new Error("Appwrite configuration missing");

    const docs = await listAllDocuments(databaseId, collectionId);
    const routes = docs.map(mapRoute);

    const routesWithConductors = await Promise.all(
      routes.map(async (route) => {
        if (!route.conductorName && route.conductorId) {
          const info = await getConductorById(route.conductorId);
          if (info) return { ...route, conductorName: info.name };
        }
        return route;
      })
    );

    routesWithConductors.sort((a, b) => b.timestamp - a.timestamp);
    return routesWithConductors;
  } catch (error) {
    console.error("Error getting all routes:", error);
    return [];
  }
}

// Get active routes (unlimited, controlled batching)
export async function getActiveRoutes(): Promise<RouteInfo[]> {
  try {
    const databaseId = config.databaseId!;
    const collectionId = getRoutesCollectionId();
    if (!databaseId || !collectionId)
      throw new Error("Appwrite configuration missing");

    const docs = await listAllDocuments(databaseId, collectionId, [
      Query.equal("active", true),
    ]);
    const routes = docs.map(mapRoute);

    const routesWithConductors = await Promise.all(
      routes.map(async (route) => {
        if (!route.conductorName && route.conductorId) {
          const info = await getConductorById(route.conductorId);
          if (info) return { ...route, conductorName: info.name };
        }
        return route;
      })
    );

    routesWithConductors.sort((a, b) => b.timestamp - a.timestamp);
    return routesWithConductors;
  } catch (error) {
    console.error("Error getting active routes:", error);
    return [];
  }
}

// Get routes by bus number (unlimited, controlled batching)
export async function getRoutesByBusNumber(
  busNumber: string
): Promise<RouteInfo[]> {
  try {
    const databaseId = config.databaseId!;
    const collectionId = getRoutesCollectionId();
    if (!databaseId || !collectionId)
      throw new Error("Appwrite configuration missing");

    const docs = await listAllDocuments(databaseId, collectionId, [
      Query.equal("busNumber", busNumber),
    ]);
    const routes = docs.map(mapRoute);

    const routesWithConductors = await Promise.all(
      routes.map(async (route) => {
        if (!route.conductorName && route.conductorId) {
          const info = await getConductorById(route.conductorId);
          if (info) return { ...route, conductorName: info.name };
        }
        return route;
      })
    );

    routesWithConductors.sort((a, b) => b.timestamp - a.timestamp);
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
    const databaseId = config.databaseId!;
    const collectionId = getRoutesCollectionId();
    if (!databaseId || !collectionId)
      throw new Error("Appwrite configuration missing");

    await databases.updateDocument(databaseId, collectionId, routeId, {
      active,
    });
    return true;
  } catch (error) {
    console.error("Error updating route status:", error);
    return false;
  }
}

// Get buses by route (unlimited, controlled batching)
export async function getBusesByRoute(
  from: string,
  to: string
): Promise<RouteInfo[]> {
  try {
    const databaseId = config.databaseId!;
    const collectionId = getRoutesCollectionId();
    if (!databaseId || !collectionId)
      throw new Error("Appwrite configuration missing");

    const docs = await listAllDocuments(databaseId, collectionId, [
      Query.equal("from", from),
      Query.equal("to", to),
    ]);
    const routes = docs.map(mapRoute);

    const routesWithConductors = await Promise.all(
      routes.map(async (route) => {
        if (!route.conductorName && route.conductorId) {
          const info = await getConductorById(route.conductorId);
          if (info) return { ...route, conductorName: info.name };
        }
        return route;
      })
    );

    routesWithConductors.sort((a, b) => b.timestamp - a.timestamp);
    return routesWithConductors;
  } catch (error) {
    console.error("Error getting buses by route:", error);
    return [];
  }
}
