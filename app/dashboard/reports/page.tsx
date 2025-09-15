/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { DatePickerWithRange } from "@/components/date-picker-with-range";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import type { DateRange } from "react-day-picker";
import { subDays, format } from "date-fns";
import { Download, FileText, Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";

import {
  generateReport,      // for excel/csv
  getSavedReports,
  downloadReport,
  deleteReport,
  fetchReportData,     // to build PDF on client
  saveReportFile,      // to upload client-generated PDF
} from "@/lib/reports-service";

interface SavedReport {
  $id: string;
  name: string;
  type: string;
  format: string;
  dateGenerated: string;
  dateRange: {
    from: string;
    to: string;
  };
  fileId: string;
  fileSize: number;
}

export default function ReportsPage() {
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: subDays(new Date(), 30),
    to: new Date(),
  });
  const [isGenerating, setIsGenerating] = useState(false);
  const [reportType, setReportType] = useState("revenue");
  const [reportFormat, setReportFormat] = useState<"pdf" | "excel" | "csv">("pdf");
  const [includeCharts, setIncludeCharts] = useState(false);
  const [includeSummary, setIncludeSummary] = useState(true);
  const [savedReports, setSavedReports] = useState<SavedReport[]>([]);
  const [isLoadingReports, setIsLoadingReports] = useState(true);

  useEffect(() => {
    loadSavedReports();
  }, []);

  const loadSavedReports = async () => {
    try {
      setIsLoadingReports(true);
      const reports = await getSavedReports();
      setSavedReports(reports as unknown as SavedReport[]);
    } catch (error) {
      console.error("Failed to load saved reports:", error);
      toast.error("Failed to load saved reports");
    } finally {
      setIsLoadingReports(false);
    }
  };

  const buildPdfBlob = async (reportType: string, opts: { fromISO: string; toISO: string; includeSummary: boolean }) => {
    // ⬇️ Import jspdf in the client ONLY here
    const { jsPDF } = await import("jspdf");
    await import("jspdf-autotable");

    // Fetch the data we need to render
    const reportData = await fetchReportData(reportType, { from: opts.fromISO, to: opts.toISO });

    const doc = new jsPDF();

    // Header
    doc.setFontSize(20);
    doc.text(`${reportType.charAt(0).toUpperCase() + reportType.slice(1)} Report`, 20, 20);

    doc.setFontSize(12);
    doc.text(`Generated: ${format(new Date(), "MMM dd, yyyy HH:mm")}`, 20, 30);
    doc.text(
      `Period: ${format(new Date(reportData.metadata.dateRange.from), "MMM dd, yyyy")} - ${format(
        new Date(reportData.metadata.dateRange.to),
        "MMM dd, yyyy"
      )}`,
      20,
      40
    );

    let yPosition = 60;

    // Summary section
    if (opts.includeSummary && reportData.summary) {
      doc.setFontSize(16);
      doc.text("Summary", 20, yPosition);
      yPosition += 10;

      doc.setFontSize(12);
      Object.entries(reportData.summary).forEach(([key, value]) => {
        doc.text(`${key}: ${typeof value === "number" ? value.toLocaleString() : value}`, 20, yPosition);
        yPosition += 8;
      });
      yPosition += 10;
    }

    // Data table
    if (reportData.data.length > 0) {
      const headers = Object.keys(reportData.data[0]);
      const rows = reportData.data.map((item: any) => headers.map((header) => item[header]?.toString() || ""));
      (doc as any).autoTable({
        head: [headers],
        body: rows,
        startY: yPosition,
        styles: { fontSize: 8 },
        headStyles: { fillColor: [41, 128, 185] },
      });
    }

    const arrayBuffer = doc.output("arraybuffer") as ArrayBuffer;
    return new Blob([arrayBuffer], { type: "application/pdf" });
  };

  const handleGenerateReport = async () => {
    if (!dateRange?.from || !dateRange?.to) {
      toast.error("Please select a valid date range");
      return;
    }

    setIsGenerating(true);

    const payload = {
      type: reportType,
      format: reportFormat,
      dateRange: {
        from: dateRange.from.toISOString(),
        to: dateRange.to.toISOString(),
      },
      options: {
        includeCharts,
        includeSummary,
      },
    } as const;

    try {
      if (reportFormat === "pdf") {
        // Create the PDF on the client
        const blob = await buildPdfBlob(reportType, {
          fromISO: payload.dateRange.from,
          toISO: payload.dateRange.to,
          includeSummary,
        });

        // Filename
        const fileName = `${reportType}-report-${format(dateRange.from, "yyyy-MM-dd")}-to-${format(
          dateRange.to,
          "yyyy-MM-dd"
        )}.pdf`;

        // Save to Appwrite Storage + DB
        const file = new File([blob], fileName, { type: "application/pdf" });
        // We also need metadata for DB; reuse fetchReportData metadata
        const dataForMeta = await fetchReportData(reportType, payload.dateRange);
        await saveReportFile(file, payload, dataForMeta.metadata);
      } else {
        // Excel or CSV: let the service handle generation and saving
        await generateReport(payload as any);
      }

      toast.success(`${reportFormat.toUpperCase()} report generated successfully!`);

      // Refresh saved reports list
      await loadSavedReports();
    } catch (error) {
      console.error("Failed to generate report:", error);
      toast.error("Failed to generate report. Please try again.");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDownloadReport = async (report: SavedReport) => {
    try {
      await downloadReport(report.fileId, report.name, report.format);
      toast.success("Report downloaded successfully!");
    } catch (error) {
      console.error("Failed to download report:", error);
      toast.error("Failed to download report");
    }
  };

  const handleDeleteReport = async (report: SavedReport) => {
    try {
      await deleteReport(report.$id, report.fileId);
      toast.success("Report deleted successfully!");
      await loadSavedReports();
    } catch (error) {
      console.error("Failed to delete report:", error);
      toast.error("Failed to delete report");
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Number.parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Reports</h1>
      </div>

      <Tabs defaultValue="generate" className="space-y-4">
        <TabsList className="bg-primary text-white">
          <TabsTrigger value="generate">Generate Report</TabsTrigger>
          <TabsTrigger value="saved">Saved Reports</TabsTrigger>
        </TabsList>

        <TabsContent value="generate" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Generate New Report</CardTitle>
              <CardDescription>Create custom reports for your bus ticketing system</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="report-type">Report Type</Label>
                  <Select value={reportType} onValueChange={setReportType}>
                    <SelectTrigger id="report-type">
                      <SelectValue placeholder="Select report type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="revenue">Revenue Report</SelectItem>
                      <SelectItem value="tickets">Ticket Sales Report</SelectItem>
                      <SelectItem value="routes">Routes Performance Report</SelectItem>
                      <SelectItem value="buses">Bus Utilization Report</SelectItem>
                      <SelectItem value="users">User Activity Report</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Date Range</Label>
                  <DatePickerWithRange date={dateRange} onDateChange={setDateRange} />
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="format">Format</Label>
                  <Select value={reportFormat} onValueChange={(v) => setReportFormat(v as any)}>
                    <SelectTrigger id="format">
                      <SelectValue placeholder="Select format" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pdf">PDF</SelectItem>
                      <SelectItem value="excel">Excel</SelectItem>
                      <SelectItem value="csv">CSV</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Options</Label>
                  <div className="flex flex-col gap-2 pt-2">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="charts"
                        checked={includeCharts}
                        onCheckedChange={(checked) => setIncludeCharts(checked === true)}
                      />
                      <label
                        htmlFor="charts"
                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                      >
                        Include charts
                      </label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="summary"
                        checked={includeSummary}
                        onCheckedChange={(checked) => setIncludeSummary(checked === true)}
                      />
                      <label
                        htmlFor="summary"
                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                      >
                        Include summary
                      </label>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
            <CardFooter className="flex justify-end">
              <Button onClick={handleGenerateReport} disabled={isGenerating}>
                {isGenerating ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <FileText className="mr-2 h-4 w-4" />
                    Generate Report
                  </>
                )}
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>

        <TabsContent value="saved" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Saved Reports</CardTitle>
              <CardDescription>Access your previously generated reports</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoadingReports ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin" />
                  <span className="ml-2">Loading reports...</span>
                </div>
              ) : savedReports.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No saved reports found. Generate your first report to get started.
                </div>
              ) : (
                <div className="rounded-md border">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b bg-primary hover:bg-primary/50 text-white">
                        <th className="h-10 px-4 text-left align-middle font-medium">Report Name</th>
                        <th className="h-10 px-4 text-left align-middle font-medium">Type</th>
                        <th className="h-10 px-4 text-left align-middle font-medium">Date Generated</th>
                        <th className="h-10 px-4 text-left align-middle font-medium">Format</th>
                        <th className="h-10 px-4 text-left align-middle font-medium">Size</th>
                        <th className="h-10 px-4 text-right align-middle font-medium">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {savedReports.map((report) => (
                        <tr key={report.$id} className="border-b">
                          <td className="p-4 align-middle">{report.name}</td>
                          <td className="p-4 align-middle capitalize">{report.type}</td>
                          <td className="p-4 align-middle">{format(new Date(report.dateGenerated), "MMM dd, yyyy")}</td>
                          <td className="p-4 align-middle uppercase">{report.format}</td>
                          <td className="p-4 align-middle">{formatFileSize(report.fileSize)}</td>
                          <td className="p-4 align-middle text-right">
                            <div className="flex items-center justify-end gap-2">
                              <Button variant="ghost" size="sm" onClick={() => handleDownloadReport(report)}>
                                <Download className="h-4 w-4" />
                                <span className="sr-only">Download</span>
                              </Button>
                              <Button variant="ghost" size="sm" onClick={() => handleDeleteReport(report)}>
                                <Trash2 className="h-4 w-4" />
                                <span className="sr-only">Delete</span>
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
