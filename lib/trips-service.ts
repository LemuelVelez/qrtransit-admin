import { databases, config } from "./appwrite"
import { Query } from "appwrite"

export interface Trip {
  id: string
  passengerName: string
  fare: string
  from: string
  to: string
  timestamp: number
  paymentMethod: string
  transactionId: string
  conductorId: string
  passengerPhoto?: string
  passengerType?: string
  kilometer?: string
  totalTrips?: string
  totalPassengers?: string
  totalRevenue?: string
  busNumber?: string
}

// Get the collection ID for trips
const getTripsCollectionId = () => {
  return process.env.NEXT_PUBLIC_APPWRITE_TRIPS_COLLECTION_ID || ""
}

// Get all trips
export async function getAllTrips(): Promise<Trip[]> {
  try {
    const databaseId = config.databaseId
    const collectionId = getTripsCollectionId()

    if (!databaseId || !collectionId) {
      throw new Error("Appwrite configuration missing")
    }

    const response = await databases.listDocuments(databaseId, collectionId, [Query.orderDesc("timestamp")])

    return response.documents.map((doc) => ({
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
      busNumber: doc.busNumber || "",
    }))
  } catch (error) {
    console.error("Error getting all trips:", error)
    return []
  }
}

// Get trips by date range
export async function getTripsByDateRange(startDate: Date, endDate: Date, conductorId?: string): Promise<Trip[]> {
  try {
    const databaseId = config.databaseId
    const collectionId = getTripsCollectionId()

    if (!databaseId || !collectionId) {
      throw new Error("Appwrite configuration missing")
    }

    // Convert dates to timestamps (as strings)
    const startTimestamp = startDate.getTime().toString()
    const endTimestamp = endDate.setHours(23, 59, 59, 999).toString()

    const queries = [
      Query.greaterThanEqual("timestamp", startTimestamp),
      Query.lessThanEqual("timestamp", endTimestamp),
      Query.orderDesc("timestamp"),
    ]

    // Add conductor filter if provided
    if (conductorId) {
      queries.push(Query.equal("conductorId", conductorId))
    }

    const response = await databases.listDocuments(databaseId, collectionId, queries)

    return response.documents.map((doc) => ({
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
      busNumber: doc.busNumber || "",
    }))
  } catch (error) {
    console.error("Error getting trips by date range:", error)
    return []
  }
}

// Get trips by bus number
export async function getTripsByBusNumber(busNumber: string): Promise<Trip[]> {
  try {
    const databaseId = config.databaseId
    const collectionId = getTripsCollectionId()

    if (!databaseId || !collectionId) {
      throw new Error("Appwrite configuration missing")
    }

    const response = await databases.listDocuments(databaseId, collectionId, [
      Query.equal("busNumber", busNumber),
      Query.orderDesc("timestamp"),
    ])

    return response.documents.map((doc) => ({
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
      busNumber: doc.busNumber || "",
    }))
  } catch (error) {
    console.error("Error getting trips by bus number:", error)
    return []
  }
}

// Get trips by route (from and to)
export async function getTripsByRoute(from: string, to: string): Promise<Trip[]> {
  try {
    const databaseId = config.databaseId
    const collectionId = getTripsCollectionId()

    if (!databaseId || !collectionId) {
      throw new Error("Appwrite configuration missing")
    }

    const response = await databases.listDocuments(databaseId, collectionId, [
      Query.equal("from", from),
      Query.equal("to", to),
      Query.orderDesc("timestamp"),
    ])

    return response.documents.map((doc) => ({
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
      busNumber: doc.busNumber || "",
    }))
  } catch (error) {
    console.error("Error getting trips by route:", error)
    return []
  }
}

// Get analytics data
export async function getAnalyticsData(startDate?: Date, endDate?: Date) {
  try {
    const databaseId = config.databaseId
    const collectionId = getTripsCollectionId()

    if (!databaseId || !collectionId) {
      throw new Error("Appwrite configuration missing")
    }

    const queries = [Query.orderDesc("timestamp")]

    // Add date range if provided
    if (startDate && endDate) {
      const startTimestamp = startDate.getTime().toString()
      const endTimestamp = endDate.setHours(23, 59, 59, 999).toString()

      queries.push(Query.greaterThanEqual("timestamp", startTimestamp))
      queries.push(Query.lessThanEqual("timestamp", endTimestamp))
    }

    const response = await databases.listDocuments(databaseId, collectionId, queries)
    const trips = response.documents

    // Calculate analytics
    let totalRevenue = 0
    let cashRevenue = 0
    let qrRevenue = 0
    const totalTrips = trips.length
    const routeCounts: Record<string, number> = {}
    const busCounts: Record<string, number> = {}
    const conductorCounts: Record<string, number> = {}
    const dailyRevenue: Record<string, number> = {}

    trips.forEach((trip) => {
      // Calculate revenue
      const fare = Number.parseFloat(trip.fare.replace("₱", "")) || 0
      totalRevenue += fare

      if (trip.paymentMethod === "QR") {
        qrRevenue += fare
      } else {
        cashRevenue += fare
      }

      // Count routes
      const route = `${trip.from} → ${trip.to}`
      routeCounts[route] = (routeCounts[route] || 0) + 1

      // Count buses
      if (trip.busNumber) {
        busCounts[trip.busNumber] = (busCounts[trip.busNumber] || 0) + 1
      }

      // Count conductors
      if (trip.conductorId) {
        conductorCounts[trip.conductorId] = (conductorCounts[trip.conductorId] || 0) + 1
      }

      // Daily revenue
      const day = new Date(Number(trip.timestamp)).toISOString().split("T")[0]
      dailyRevenue[day] = (dailyRevenue[day] || 0) + fare
    })

    // Sort and get top routes
    const topRoutes = Object.entries(routeCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([route, count]) => ({ route, count }))

    // Sort and get top buses
    const topBuses = Object.entries(busCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([busNumber, count]) => ({ busNumber, count }))

    // Format daily revenue for charts
    const dailyRevenueData = Object.entries(dailyRevenue)
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([date, amount]) => ({ date, amount }))

    return {
      totalRevenue,
      cashRevenue,
      qrRevenue,
      totalTrips,
      topRoutes,
      topBuses,
      dailyRevenueData,
    }
  } catch (error) {
    console.error("Error getting analytics data:", error)
    throw error
  }
}

