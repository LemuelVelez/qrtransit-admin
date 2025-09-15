"use client";
/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { Client, Databases, Storage, ID, Query } from "appwrite";
import { format } from "date-fns";
import * as XLSX from "xlsx";

const client = new Client()
  .setEndpoint(process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT as string)
  .setProject(process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID as string);

const databases = new Databases(client);
const storage = new Storage(client);

const DATABASE_ID = process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID as string;
const TRIPS_COLLECTION_ID = process.env
  .NEXT_PUBLIC_APPWRITE_TRIPS_COLLECTION_ID as string;
const ROUTES_COLLECTION_ID = process.env
  .NEXT_PUBLIC_APPWRITE_ROUTES_COLLECTION_ID as string;
const USERS_COLLECTION_ID = process.env
  .NEXT_PUBLIC_APPWRITE_USERS_COLLECTION_ID as string;
const TRANSACTIONS_COLLECTION_ID = process.env
  .NEXT_PUBLIC_APPWRITE_TRANSACTIONS_COLLECTION_ID as string;
const REPORTS_COLLECTION_ID =
  process.env.NEXT_PUBLIC_APPWRITE_REPORTS_COLLECTION_ID || "reports";
const AVATAR_BUCKET_ID = process.env
  .NEXT_PUBLIC_APPWRITE_AVATAR_BUCKET_ID as string;

interface ReportData {
  type: string;
  format: "pdf" | "excel" | "csv";
  dateRange: {
    from: string;
    to: string;
  };
  options: {
    includeCharts: boolean;
    includeSummary: boolean;
  };
}

interface ReportResult {
  data: any[];
  summary: any;
  metadata: {
    totalRecords: number;
    dateRange: {
      from: string;
      to: string;
    };
    generatedAt: string;
  };
}

export async function fetchReportData(
  reportType: string,
  dateRange: { from: string; to: string }
): Promise<ReportResult> {
  const fromDate = new Date(dateRange.from).toISOString();
  const toDate = new Date(dateRange.to).toISOString();

  try {
    switch (reportType) {
      case "revenue":
        return await fetchRevenueData(fromDate, toDate);
      case "tickets":
        return await fetchTicketSalesData(fromDate, toDate);
      case "routes":
        return await fetchRoutesPerformanceData(fromDate, toDate);
      case "buses":
        return await fetchBusUtilizationData(fromDate, toDate);
      case "users":
        return await fetchUserActivityData(fromDate, toDate);
      default:
        throw new Error("Invalid report type");
    }
  } catch (error) {
    console.error("Error fetching report data:", error);
    throw error;
  }
}

async function fetchRevenueData(
  fromDate: string,
  toDate: string
): Promise<ReportResult> {
  const trips = await databases.listDocuments(
    DATABASE_ID,
    TRIPS_COLLECTION_ID,
    [
      Query.greaterThanEqual("timestamp", fromDate),
      Query.lessThanEqual("timestamp", toDate),
      Query.limit(1000),
    ]
  );

  const totalRevenue = trips.documents.reduce(
    (sum, trip: any) => sum + (trip.fare || 0),
    0
  );
  const cashRevenue = trips.documents
    .filter((trip: any) => trip.paymentMethod === "cash")
    .reduce((sum: number, trip: any) => sum + (trip.fare || 0), 0);
  const qrRevenue = trips.documents
    .filter((trip: any) => trip.paymentMethod === "qr")
    .reduce((sum: number, trip: any) => sum + (trip.fare || 0), 0);

  return {
    data: trips.documents.map((trip: any) => ({
      date: format(new Date(trip.timestamp), "yyyy-MM-dd"),
      passengerName: trip.passengerName,
      from: trip.from,
      to: trip.to,
      fare: trip.fare,
      paymentMethod: trip.paymentMethod,
      busNumber: trip.busNumber,
      conductorId: trip.conductorId,
    })),
    summary: {
      totalRevenue,
      cashRevenue,
      qrRevenue,
      totalTrips: trips.documents.length,
      averageFare: trips.documents.length
        ? totalRevenue / trips.documents.length
        : 0,
    },
    metadata: {
      totalRecords: trips.documents.length,
      dateRange: { from: fromDate, to: toDate },
      generatedAt: new Date().toISOString(),
    },
  };
}

async function fetchTicketSalesData(
  fromDate: string,
  toDate: string
): Promise<ReportResult> {
  const trips = await databases.listDocuments(
    DATABASE_ID,
    TRIPS_COLLECTION_ID,
    [
      Query.greaterThanEqual("timestamp", fromDate),
      Query.lessThanEqual("timestamp", toDate),
      Query.limit(1000),
    ]
  );

  const dailySales = trips.documents.reduce((acc: any, trip: any) => {
    const date = format(new Date(trip.timestamp), "yyyy-MM-dd");
    if (!acc[date]) {
      acc[date] = { count: 0, revenue: 0 };
    }
    acc[date].count += 1;
    acc[date].revenue += trip.fare || 0;
    return acc;
  }, {} as Record<string, { count: number; revenue: number }>);

  return {
    data: Object.entries(dailySales).map(([date, data]: any) => ({
      date,
      ticketsSold: data.count,
      revenue: data.revenue,
    })),
    summary: {
      totalTickets: trips.documents.length,
      totalRevenue: trips.documents.reduce(
        (sum: number, trip: any) => sum + (trip.fare || 0),
        0
      ),
      averageTicketsPerDay: Object.keys(dailySales).length
        ? trips.documents.length / Object.keys(dailySales).length
        : 0,
    },
    metadata: {
      totalRecords: trips.documents.length,
      dateRange: { from: fromDate, to: toDate },
      generatedAt: new Date().toISOString(),
    },
  };
}

async function fetchRoutesPerformanceData(
  fromDate: string,
  toDate: string
): Promise<ReportResult> {
  const trips = await databases.listDocuments(
    DATABASE_ID,
    TRIPS_COLLECTION_ID,
    [
      Query.greaterThanEqual("timestamp", fromDate),
      Query.lessThanEqual("timestamp", toDate),
      Query.limit(1000),
    ]
  );

  const routePerformance = trips.documents.reduce((acc: any, trip: any) => {
    const route = `${trip.from} - ${trip.to}`;
    if (!acc[route]) {
      acc[route] = { count: 0, revenue: 0, passengers: [] as string[] };
    }
    acc[route].count += 1;
    acc[route].revenue += trip.fare || 0;
    acc[route].passengers.push(trip.passengerName);
    return acc;
  }, {} as Record<string, { count: number; revenue: number; passengers: string[] }>);

  return {
    data: Object.entries(routePerformance).map(([route, data]: any) => ({
      route,
      tripCount: data.count,
      revenue: data.revenue,
      averageFare: data.count ? data.revenue / data.count : 0,
    })),
    summary: {
      totalRoutes: Object.keys(routePerformance).length,
      mostPopularRoute:
        Object.entries(routePerformance).sort(
          (a: any, b: any) => b[1].count - a[1].count
        )[0]?.[0] || "N/A",
      highestRevenueRoute:
        Object.entries(routePerformance).sort(
          (a: any, b: any) => b[1].revenue - a[1].revenue
        )[0]?.[0] || "N/A",
    },
    metadata: {
      totalRecords: trips.documents.length,
      dateRange: { from: fromDate, to: toDate },
      generatedAt: new Date().toISOString(),
    },
  };
}

async function fetchBusUtilizationData(
  fromDate: string,
  toDate: string
): Promise<ReportResult> {
  const trips = await databases.listDocuments(
    DATABASE_ID,
    TRIPS_COLLECTION_ID,
    [
      Query.greaterThanEqual("timestamp", fromDate),
      Query.lessThanEqual("timestamp", toDate),
      Query.limit(1000),
    ]
  );

  const busUtilization = trips.documents.reduce((acc: any, trip: any) => {
    const busNumber = trip.busNumber;
    if (!acc[busNumber]) {
      acc[busNumber] = {
        tripCount: 0,
        revenue: 0,
        conductors: new Set<string>(),
      };
    }
    acc[busNumber].tripCount += 1;
    acc[busNumber].revenue += trip.fare || 0;
    acc[busNumber].conductors.add(trip.conductorId);
    return acc;
  }, {} as Record<string, { tripCount: number; revenue: number; conductors: Set<string> }>);

  return {
    data: Object.entries(busUtilization).map(([busNumber, data]: any) => ({
      busNumber,
      tripCount: data.tripCount,
      revenue: data.revenue,
      conductorCount: data.conductors.size,
      averageRevenuePerTrip: data.tripCount ? data.revenue / data.tripCount : 0,
    })),
    summary: {
      totalBuses: Object.keys(busUtilization).length,
      mostUtilizedBus:
        Object.entries(busUtilization).sort(
          (a: any, b: any) => b[1].tripCount - a[1].tripCount
        )[0]?.[0] || "N/A",
      highestRevenueBus:
        Object.entries(busUtilization).sort(
          (a: any, b: any) => b[1].revenue - a[1].revenue
        )[0]?.[0] || "N/A",
    },
    metadata: {
      totalRecords: trips.documents.length,
      dateRange: { from: fromDate, to: toDate },
      generatedAt: new Date().toISOString(),
    },
  };
}

async function fetchUserActivityData(
  fromDate: string,
  toDate: string
): Promise<ReportResult> {
  const users = await databases.listDocuments(
    DATABASE_ID,
    USERS_COLLECTION_ID,
    [Query.limit(1000)]
  );
  const trips = await databases.listDocuments(
    DATABASE_ID,
    TRIPS_COLLECTION_ID,
    [
      Query.greaterThanEqual("timestamp", fromDate),
      Query.lessThanEqual("timestamp", toDate),
      Query.limit(1000),
    ]
  );

  const conductorActivity = trips.documents.reduce((acc: any, trip: any) => {
    const conductorId = trip.conductorId;
    if (!acc[conductorId]) {
      acc[conductorId] = { tripCount: 0, revenue: 0 };
    }
    acc[conductorId].tripCount += 1;
    acc[conductorId].revenue += trip.fare || 0;
    return acc;
  }, {} as Record<string, { tripCount: number; revenue: number }>);

  return {
    data: Object.entries(conductorActivity).map(([conductorId, data]: any) => {
      const conductor = users.documents.find(
        (user: any) => user.userId === conductorId
      );
      return {
        conductorId,
        conductorName: conductor
          ? `${conductor.firstname} ${conductor.lastname}`
          : "Unknown",
        tripCount: data.tripCount,
        revenue: data.revenue,
        averageRevenuePerTrip: data.tripCount
          ? data.revenue / data.tripCount
          : 0,
      };
    }),
    summary: {
      totalConductors: Object.keys(conductorActivity).length,
      totalUsers: users.documents.length,
      mostActiveConductor:
        Object.entries(conductorActivity).sort(
          (a: any, b: any) => b[1].tripCount - a[1].tripCount
        )[0]?.[0] || "N/A",
    },
    metadata: {
      totalRecords: trips.documents.length,
      dateRange: { from: fromDate, to: toDate },
      generatedAt: new Date().toISOString(),
    },
  };
}

/* ========= Helpers for Excel/CSV generation (client-safe) ========= */

function toUint8Array(
  bufferLike: ArrayBuffer | ArrayBufferView | any
): Uint8Array {
  if (bufferLike instanceof Uint8Array) return bufferLike;
  if (bufferLike instanceof ArrayBuffer) return new Uint8Array(bufferLike);
  if (bufferLike && bufferLike.buffer instanceof ArrayBuffer)
    return new Uint8Array(bufferLike.buffer);
  if (typeof bufferLike === "string")
    return new TextEncoder().encode(bufferLike);
  try {
    return new Uint8Array(bufferLike);
  } catch {
    throw new Error("Unable to convert buffer-like value to Uint8Array");
  }
}

function generateExcelReport(
  reportData: ReportResult,
  reportType: string,
  options: any
): Uint8Array {
  const workbook = XLSX.utils.book_new();

  if (options.includeSummary && reportData.summary) {
    const summaryData = Object.entries(
      reportData.summary
    ).map(([key, value]) => [key, value]);
    const summarySheet = XLSX.utils.aoa_to_sheet([
      [
        `${reportType.charAt(0).toUpperCase() +
          reportType.slice(1)} Report Summary`,
      ],
      [`Generated: ${format(new Date(), "MMM dd, yyyy HH:mm")}`],
      [
        `Period: ${format(
          new Date(reportData.metadata.dateRange.from),
          "MMM dd, yyyy"
        )} - ${format(
          new Date(reportData.metadata.dateRange.to),
          "MMM dd, yyyy"
        )}`,
      ],
      [],
      ...summaryData,
    ]);
    XLSX.utils.book_append_sheet(workbook, summarySheet, "Summary");
  }

  if (reportData.data.length > 0) {
    const dataSheet = XLSX.utils.json_to_sheet(reportData.data);
    XLSX.utils.book_append_sheet(workbook, dataSheet, "Data");
  }

  const xlsxArrayBuffer = XLSX.write(workbook, {
    type: "array",
    bookType: "xlsx",
  }) as ArrayBuffer;
  return toUint8Array(xlsxArrayBuffer);
}

function generateCSVReport(
  reportData: ReportResult,
  _reportType: string,
  _options: any
): Uint8Array {
  if (reportData.data.length === 0) {
    return new TextEncoder().encode(
      "No data available for the selected period"
    );
  }

  const headers = Object.keys(reportData.data[0]);
  const csvContent = [
    headers.join(","),
    ...reportData.data.map((row: any) =>
      headers
        .map((header) => {
          const value = row[header]?.toString() || "";
          return value.includes(",") ? `"${value}"` : value;
        })
        .join(",")
    ),
  ].join("\n");

  return new TextEncoder().encode(csvContent);
}

/* ========= Public API ========= */

/**
 * Generate **non-PDF** reports (Excel/CSV) and save to storage + DB.
 * PDF is generated on the client page and saved via `saveReportFile`.
 */
export async function generateReport(reportData: ReportData) {
  try {
    if (reportData.format === "pdf") {
      throw new Error(
        "PDF generation is client-only. Use fetchReportData + saveReportFile from the page."
      );
    }

    // Fetch real-time data
    const data = await fetchReportData(reportData.type, reportData.dateRange);

    // Generate file based on format
    let fileBuffer: Uint8Array;
    let mimeType: string;
    let fileExtension: string;

    switch (reportData.format) {
      case "excel":
        fileBuffer = generateExcelReport(
          data,
          reportData.type,
          reportData.options
        );
        mimeType =
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
        fileExtension = "xlsx";
        break;
      case "csv":
        fileBuffer = generateCSVReport(
          data,
          reportData.type,
          reportData.options
        );
        mimeType = "text/csv";
        fileExtension = "csv";
        break;
      default:
        throw new Error("Unsupported format");
    }

    const fileName = `${reportData.type}-report-${format(
      new Date(reportData.dateRange.from),
      "yyyy-MM-dd"
    )}-to-${format(
      new Date(reportData.dateRange.to),
      "yyyy-MM-dd"
    )}.${fileExtension}`;

    const file = await storage.createFile(
      AVATAR_BUCKET_ID,
      ID.unique(),
      new File([fileBuffer], fileName, { type: mimeType })
    );

    const reportRecord = await databases.createDocument(
      DATABASE_ID,
      REPORTS_COLLECTION_ID,
      ID.unique(),
      {
        name: fileName,
        type: reportData.type,
        format: reportData.format,
        dateGenerated: new Date().toISOString(),
        dateRange: reportData.dateRange,
        fileId: file.$id,
        fileSize: (file as any).sizeOriginal ?? (file as any).size,
        metadata: JSON.stringify(data.metadata),
      }
    );

    return {
      reportId: reportRecord.$id,
      fileId: file.$id,
      fileName,
      fileSize: (file as any).sizeOriginal ?? (file as any).size,
    };
  } catch (error) {
    console.error("Error generating report:", error);
    throw error;
  }
}

/**
 * Save a pre-generated file (e.g., **PDF generated in the page**) to Appwrite storage and DB.
 */
export async function saveReportFile(
  file: File,
  payload: ReportData,
  metadata: ReportResult["metadata"]
) {
  try {
    const uploaded = await storage.createFile(
      AVATAR_BUCKET_ID,
      ID.unique(),
      file
    );

    const reportRecord = await databases.createDocument(
      DATABASE_ID,
      REPORTS_COLLECTION_ID,
      ID.unique(),
      {
        name: file.name,
        type: payload.type,
        format: payload.format,
        dateGenerated: new Date().toISOString(),
        dateRange: payload.dateRange,
        fileId: uploaded.$id,
        fileSize: (uploaded as any).sizeOriginal ?? (uploaded as any).size,
        metadata: JSON.stringify(metadata),
      }
    );

    return {
      reportId: reportRecord.$id,
      fileId: uploaded.$id,
      fileName: file.name,
      fileSize: (uploaded as any).sizeOriginal ?? (uploaded as any).size,
    };
  } catch (error) {
    console.error("Error saving report file:", error);
    throw error;
  }
}

export async function getSavedReports() {
  try {
    const reports = await databases.listDocuments(
      DATABASE_ID,
      REPORTS_COLLECTION_ID,
      [Query.orderDesc("dateGenerated"), Query.limit(100)]
    );
    return reports.documents;
  } catch (error) {
    console.error("Error fetching saved reports:", error);
    throw error;
  }
}

export async function downloadReport(
  fileId: string,
  fileName: string,
  format: string
) {
  try {
    const file = await storage.getFileDownload(AVATAR_BUCKET_ID, fileId);

    // In the browser SDK, this is typically a URL string
    const url = typeof file === "string" ? file : (file as any).href ?? file;

    const link = document.createElement("a");
    link.href = url as string;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  } catch (error) {
    console.error("Error downloading report:", error);
    throw error;
  }
}

export async function deleteReport(reportId: string, fileId: string) {
  try {
    await storage.deleteFile(AVATAR_BUCKET_ID, fileId);
    await databases.deleteDocument(
      DATABASE_ID,
      REPORTS_COLLECTION_ID,
      reportId
    );
  } catch (error) {
    console.error("Error deleting report:", error);
    throw error;
  }
}
