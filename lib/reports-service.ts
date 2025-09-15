/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { Client, Databases, Storage, ID, Query } from "appwrite";
import { format } from "date-fns";
import jsPDF from "jspdf";
import "jspdf-autotable";
import * as XLSX from "xlsx";

const client = new Client()
  .setEndpoint(process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT)
  .setProject(process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID);

const databases = new Databases(client);
const storage = new Storage(client);

const DATABASE_ID = process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID;
const TRIPS_COLLECTION_ID =
  process.env.NEXT_PUBLIC_APPWRITE_TRIPS_COLLECTION_ID;
const ROUTES_COLLECTION_ID =
  process.env.NEXT_PUBLIC_APPWRITE_ROUTES_COLLECTION_ID;
const USERS_COLLECTION_ID =
  process.env.NEXT_PUBLIC_APPWRITE_USERS_COLLECTION_ID;
const TRANSACTIONS_COLLECTION_ID =
  process.env.NEXT_PUBLIC_APPWRITE_TRANSACTIONS_COLLECTION_ID;
const REPORTS_COLLECTION_ID =
  process.env.NEXT_PUBLIC_APPWRITE_REPORTS_COLLECTION_ID || "reports";
const AVATAR_BUCKET_ID = process.env.NEXT_PUBLIC_APPWRITE_AVATAR_BUCKET_ID;

interface ReportData {
  type: string;
  format: string;
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

  const transactions = await databases.listDocuments(
    DATABASE_ID,
    TRANSACTIONS_COLLECTION_ID,
    [
      Query.greaterThanEqual("timestamp", fromDate),
      Query.lessThanEqual("timestamp", toDate),
      Query.equal("type", "payment"),
      Query.limit(1000),
    ]
  );

  const totalRevenue = trips.documents.reduce(
    (sum, trip) => sum + (trip.fare || 0),
    0
  );
  const cashRevenue = trips.documents
    .filter((trip) => trip.paymentMethod === "cash")
    .reduce((sum, trip) => sum + (trip.fare || 0), 0);
  const qrRevenue = trips.documents
    .filter((trip) => trip.paymentMethod === "qr")
    .reduce((sum, trip) => sum + (trip.fare || 0), 0);

  return {
    data: trips.documents.map((trip) => ({
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
      averageFare: totalRevenue / trips.documents.length || 0,
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

  const dailySales = trips.documents.reduce((acc, trip) => {
    const date = format(new Date(trip.timestamp), "yyyy-MM-dd");
    if (!acc[date]) {
      acc[date] = { count: 0, revenue: 0 };
    }
    acc[date].count += 1;
    acc[date].revenue += trip.fare || 0;
    return acc;
  }, {} as Record<string, { count: number; revenue: number }>);

  return {
    data: Object.entries(dailySales).map(([date, data]) => ({
      date,
      ticketsSold: data.count,
      revenue: data.revenue,
    })),
    summary: {
      totalTickets: trips.documents.length,
      totalRevenue: trips.documents.reduce(
        (sum, trip) => sum + (trip.fare || 0),
        0
      ),
      averageTicketsPerDay:
        trips.documents.length / Object.keys(dailySales).length || 0,
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

  const routePerformance = trips.documents.reduce((acc, trip) => {
    const route = `${trip.from} - ${trip.to}`;
    if (!acc[route]) {
      acc[route] = { count: 0, revenue: 0, passengers: [] };
    }
    acc[route].count += 1;
    acc[route].revenue += trip.fare || 0;
    acc[route].passengers.push(trip.passengerName);
    return acc;
  }, {} as Record<string, { count: number; revenue: number; passengers: string[] }>);

  return {
    data: Object.entries(routePerformance).map(([route, data]) => ({
      route,
      tripCount: data.count,
      revenue: data.revenue,
      averageFare: data.revenue / data.count || 0,
    })),
    summary: {
      totalRoutes: Object.keys(routePerformance).length,
      mostPopularRoute:
        Object.entries(routePerformance).sort(
          (a, b) => b[1].count - a[1].count
        )[0]?.[0] || "N/A",
      highestRevenueRoute:
        Object.entries(routePerformance).sort(
          (a, b) => b[1].revenue - a[1].revenue
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

  const busUtilization = trips.documents.reduce((acc, trip) => {
    const busNumber = trip.busNumber;
    if (!acc[busNumber]) {
      acc[busNumber] = { tripCount: 0, revenue: 0, conductors: new Set() };
    }
    acc[busNumber].tripCount += 1;
    acc[busNumber].revenue += trip.fare || 0;
    acc[busNumber].conductors.add(trip.conductorId);
    return acc;
  }, {} as Record<string, { tripCount: number; revenue: number; conductors: Set<string> }>);

  return {
    data: Object.entries(busUtilization).map(([busNumber, data]) => ({
      busNumber,
      tripCount: data.tripCount,
      revenue: data.revenue,
      conductorCount: data.conductors.size,
      averageRevenuePerTrip: data.revenue / data.tripCount || 0,
    })),
    summary: {
      totalBuses: Object.keys(busUtilization).length,
      mostUtilizedBus:
        Object.entries(busUtilization).sort(
          (a, b) => b[1].tripCount - a[1].tripCount
        )[0]?.[0] || "N/A",
      highestRevenueBus:
        Object.entries(busUtilization).sort(
          (a, b) => b[1].revenue - a[1].revenue
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

  const conductorActivity = trips.documents.reduce((acc, trip) => {
    const conductorId = trip.conductorId;
    if (!acc[conductorId]) {
      acc[conductorId] = { tripCount: 0, revenue: 0 };
    }
    acc[conductorId].tripCount += 1;
    acc[conductorId].revenue += trip.fare || 0;
    return acc;
  }, {} as Record<string, { tripCount: number; revenue: number }>);

  return {
    data: Object.entries(conductorActivity).map(([conductorId, data]) => {
      const conductor = users.documents.find(
        (user) => user.userId === conductorId
      );
      return {
        conductorId,
        conductorName: conductor
          ? `${conductor.firstname} ${conductor.lastname}`
          : "Unknown",
        tripCount: data.tripCount,
        revenue: data.revenue,
        averageRevenuePerTrip: data.revenue / data.tripCount || 0,
      };
    }),
    summary: {
      totalConductors: Object.keys(conductorActivity).length,
      totalUsers: users.documents.length,
      mostActiveConductor:
        Object.entries(conductorActivity).sort(
          (a, b) => b[1].tripCount - a[1].tripCount
        )[0]?.[0] || "N/A",
    },
    metadata: {
      totalRecords: trips.documents.length,
      dateRange: { from: fromDate, to: toDate },
      generatedAt: new Date().toISOString(),
    },
  };
}

/**
 * Helper: convert something that may be an ArrayBuffer (or ArrayBuffer-like) to Uint8Array
 */
function toUint8Array(
  bufferLike: ArrayBuffer | ArrayBufferView | any
): Uint8Array {
  if (bufferLike instanceof Uint8Array) return bufferLike;
  if (bufferLike instanceof ArrayBuffer) return new Uint8Array(bufferLike);
  // If it's an object with `buffer` property (e.g., DataView / TypedArray)
  if (bufferLike && bufferLike.buffer instanceof ArrayBuffer)
    return new Uint8Array(bufferLike.buffer);
  // fallback: try to stringify and encode (shouldn't happen for binary outputs)
  if (typeof bufferLike === "string")
    return new TextEncoder().encode(bufferLike);
  // last resort: convert with Uint8Array.from if iterable
  try {
    return new Uint8Array(bufferLike);
  } catch {
    throw new Error("Unable to convert buffer-like value to Uint8Array");
  }
}

function generatePDFReport(
  reportData: ReportResult,
  reportType: string,
  options: any
): Uint8Array {
  const doc = new jsPDF();

  // Header
  doc.setFontSize(20);
  doc.text(
    `${reportType.charAt(0).toUpperCase() + reportType.slice(1)} Report`,
    20,
    20
  );

  doc.setFontSize(12);
  doc.text(`Generated: ${format(new Date(), "MMM dd, yyyy HH:mm")}`, 20, 30);
  doc.text(
    `Period: ${format(
      new Date(reportData.metadata.dateRange.from),
      "MMM dd, yyyy"
    )} - ${format(new Date(reportData.metadata.dateRange.to), "MMM dd, yyyy")}`,
    20,
    40
  );

  let yPosition = 60;

  // Summary section
  if (options.includeSummary && reportData.summary) {
    doc.setFontSize(16);
    doc.text("Summary", 20, yPosition);
    yPosition += 10;

    doc.setFontSize(12);
    Object.entries(reportData.summary).forEach(([key, value]) => {
      doc.text(
        `${key}: ${typeof value === "number" ? value.toLocaleString() : value}`,
        20,
        yPosition
      );
      yPosition += 8;
    });
    yPosition += 10;
  }

  // Data table
  if (reportData.data.length > 0) {
    const headers = Object.keys(reportData.data[0]);
    const rows = reportData.data.map((item) =>
      headers.map((header) => item[header]?.toString() || "")
    );
    (doc as any).autoTable({
      head: [headers],
      body: rows,
      startY: yPosition,
      styles: { fontSize: 8 },
      headStyles: { fillColor: [41, 128, 185] },
    });
  }

  const arrayBuffer = doc.output("arraybuffer") as ArrayBuffer;
  return toUint8Array(arrayBuffer);
}

function generateExcelReport(
  reportData: ReportResult,
  reportType: string,
  options: any
): Uint8Array {
  const workbook = XLSX.utils.book_new();

  // Summary sheet
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

  // Data sheet
  if (reportData.data.length > 0) {
    const dataSheet = XLSX.utils.json_to_sheet(reportData.data);
    XLSX.utils.book_append_sheet(workbook, dataSheet, "Data");
  }

  // XLSX.write with type: "array" returns an ArrayBuffer in most xlsx builds
  const xlsxArrayBuffer = XLSX.write(workbook, {
    type: "array",
    bookType: "xlsx",
  }) as ArrayBuffer;
  return toUint8Array(xlsxArrayBuffer);
}

function generateCSVReport(
  reportData: ReportResult,
  reportType: string,
  options: any
): Uint8Array {
  if (reportData.data.length === 0) {
    return new TextEncoder().encode(
      "No data available for the selected period"
    );
  }

  const headers = Object.keys(reportData.data[0]);
  const csvContent = [
    headers.join(","),
    ...reportData.data.map((row) =>
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

export async function generateReport(reportData: ReportData) {
  try {
    // Fetch real-time data
    const data = await fetchReportData(reportData.type, reportData.dateRange);

    // Generate file based on format
    let fileBuffer: Uint8Array;
    let mimeType: string;
    let fileExtension: string;

    switch (reportData.format) {
      case "pdf":
        fileBuffer = generatePDFReport(
          data,
          reportData.type,
          reportData.options
        );
        mimeType = "application/pdf";
        fileExtension = "pdf";
        break;
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

    // Create file name
    const fileName = `${reportData.type}-report-${format(
      new Date(reportData.dateRange.from),
      "yyyy-MM-dd"
    )}-to-${format(
      new Date(reportData.dateRange.to),
      "yyyy-MM-dd"
    )}.${fileExtension}`;

    // Upload to Appwrite Storage
    const file = await storage.createFile(
      AVATAR_BUCKET_ID,
      ID.unique(),
      new File([fileBuffer], fileName, { type: mimeType })
    );

    // Save report metadata to database
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
        fileSize: file.sizeOriginal,
        metadata: JSON.stringify(data.metadata),
      }
    );

    return {
      reportId: reportRecord.$id,
      fileId: file.$id,
      fileName,
      fileSize: file.sizeOriginal,
    };
  } catch (error) {
    console.error("Error generating report:", error);
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

    // Create download link
    const blob = new Blob([file], {
      type:
        format === "pdf"
          ? "application/pdf"
          : format === "excel"
          ? "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
          : "text/csv",
    });

    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  } catch (error) {
    console.error("Error downloading report:", error);
    throw error;
  }
}

export async function deleteReport(reportId: string, fileId: string) {
  try {
    // Delete file from storage
    await storage.deleteFile(AVATAR_BUCKET_ID, fileId);

    // Delete report record from database
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
