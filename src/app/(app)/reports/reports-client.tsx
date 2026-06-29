"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  Loader2,
  Eye,
  FileDown,
  Send,
  ChevronLeft,
  ChevronRight,
  Search,
  RefreshCw,
  ArrowLeft,
} from "lucide-react";
import { getReports, resendEmail, getTrackerReportData } from "@/actions/assessments";
import { formatDate, formatDateTime } from "@/lib/utils";
import { EmptyState } from "@/components/shared/empty-state";
import { StarRating } from "@/components/shared/star-rating";
import type { Tracker, AssessmentSession, AssessmentScore, Criteria, Trainee } from "@/types";

interface ReportsClientProps {
  trackers: Tracker[];
}

interface FullReportData {
  session: AssessmentSession;
  scores: AssessmentScore[];
  criteria: Criteria[];
  trainees: Trainee[];
  tracker: Tracker;
}

export function ReportsClient({ trackers }: ReportsClientProps) {
  const [sessions, setSessions] = useState<AssessmentSession[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(false);
  const [selectedTrackerId, setSelectedTrackerId] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [resendingId, setResendingId] = useState<string | null>(null);
  const [fullReport, setFullReport] = useState<FullReportData | null>(null);
  const [loadingReport, setLoadingReport] = useState(false);

  const loadReports = useCallback(async () => {
    setLoading(true);
    try {
      const result = await getReports({
        trackerId: selectedTrackerId || undefined,
        fromDate: fromDate || undefined,
        toDate: toDate || undefined,
        page,
        limit: 20,
      });
      setSessions(result.sessions);
      setTotal(result.total);
      setTotalPages(result.totalPages);
    } catch {
      toast.error("Failed to load reports.");
    } finally {
      setLoading(false);
    }
  }, [selectedTrackerId, fromDate, toDate, page]);

  useEffect(() => {
    loadReports();
  }, [loadReports]);

  const handleViewReport = async (sessionId: string) => {
    setLoadingReport(true);
    try {
      const data = await getTrackerReportData(sessionId);
      if (data) {
        setFullReport(data as unknown as FullReportData);
      } else {
        toast.error("Report data not found.");
      }
    } catch {
      toast.error("Failed to load report details.");
    } finally {
      setLoadingReport(false);
    }
  };

  const handleResend = async (sessionId: string) => {
    setResendingId(sessionId);
    try {
      const result = await resendEmail(sessionId);
      if (result.success) {
        toast.success(result.message);
        loadReports();
      } else {
        toast.error(result.error);
      }
    } catch {
      toast.error("Failed to resend email.");
    } finally {
      setResendingId(null);
    }
  };

  const scoreMap = useMemo(() => {
    const map: Record<string, Record<string, number>> = {};
    if (!fullReport) return map;
    fullReport.scores.forEach((s) => {
      if (!map[s.traineeId]) map[s.traineeId] = {};
      map[s.traineeId][s.criteriaId] = s.score;
    });
    return map;
  }, [fullReport]);

  const calculateRowTotal = (traineeId: string) => {
    const traineeScores = scoreMap[traineeId] || {};
    return Object.values(traineeScores).reduce((sum, s) => sum + s, 0);
  };

  const calculateTeamAverage = (criteriaId: string) => {
    if (!fullReport) return "0";
    const values = fullReport.trainees.map((t) => scoreMap[t.id]?.[criteriaId] ?? 0);
    const sum = values.reduce((a, b) => a + b, 0);
    return fullReport.trainees.length > 0 ? (sum / fullReport.trainees.length).toFixed(1) : "0";
  };

  const calculateGrandAverage = () => {
    if (!fullReport) return "0";
    const totals = fullReport.trainees.map((t) => calculateRowTotal(t.id));
    const sum = totals.reduce((a, b) => a + b, 0);
    return fullReport.trainees.length > 0 ? (sum / fullReport.trainees.length).toFixed(1) : "0";
  };

  return (
    <div className="space-y-6">
      {/* Back Button */}
      <Button
        variant="ghost"
        size="sm"
        className="-ml-2 h-8 text-muted-foreground hover:text-foreground"
        onClick={() => router.push("/dashboard")}
      >
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back to Dashboard
      </Button>

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Reports</h1>
        <p className="text-muted-foreground">View and manage assessment reports</p>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid gap-4 md:grid-cols-4">
            <div className="space-y-2">
              <Label>Tracker</Label>
              <Select
                value={selectedTrackerId}
                onValueChange={(val) => {
                  setSelectedTrackerId(val);
                  setPage(1);
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All trackers" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All Trackers</SelectItem>
                  {trackers.map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>From Date</Label>
              <Input
                type="date"
                value={fromDate}
                onChange={(e) => {
                  setFromDate(e.target.value);
                  setPage(1);
                }}
              />
            </div>
            <div className="space-y-2">
              <Label>To Date</Label>
              <Input
                type="date"
                value={toDate}
                onChange={(e) => {
                  setToDate(e.target.value);
                  setPage(1);
                }}
              />
            </div>
            <div className="space-y-2 flex items-end">
              <Button
                variant="outline"
                className="w-full"
                onClick={() => {
                  setSelectedTrackerId("");
                  setFromDate("");
                  setToDate("");
                  setPage(1);
                }}
              >
                <RefreshCw className="mr-2 h-4 w-4" />
                Reset
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Results */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">
            {total} assessment{total !== 1 ? "s" : ""} found
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : sessions.length === 0 ? (
            <EmptyState
              title="No reports found"
              description="Try adjusting your filters."
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-muted-foreground">
                      Date
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-muted-foreground">
                      Day
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-muted-foreground">
                      Submitted By
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-semibold uppercase text-muted-foreground">
                      Email Status
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-semibold uppercase text-muted-foreground">
                      PDF
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-semibold uppercase text-muted-foreground">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {sessions.map((session) => (
                    <tr key={session.id} className="border-b hover:bg-muted/30">
                      <td className="px-4 py-3">{formatDate(session.assessmentDate)}</td>
                      <td className="px-4 py-3">Day {session.dayNumber}</td>
                      <td className="px-4 py-3">{session.submittedByName}</td>
                      <td className="px-4 py-3 text-center">
                        <Badge
                          variant={
                            session.emailStatus === "sent"
                              ? "default"
                              : session.emailStatus === "failed"
                              ? "destructive"
                              : "secondary"
                          }
                        >
                          {session.emailStatus}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-center">
                        {session.pdfPath ? (
                          <a
                            href={`/api/download?path=${encodeURIComponent(session.pdfPath)}`}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <FileDown className="h-4 w-4" />
                            </Button>
                          </a>
                        ) : (
                          <span className="text-muted-foreground text-xs">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => handleViewReport(session.id)}
                            disabled={loadingReport}
                          >
                            {loadingReport ? (
                               <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                               <Eye className="h-4 w-4" />
                            )}
                          </Button>
                          {session.pdfPath && (
                            <a
                              href={`/api/download?path=${encodeURIComponent(session.pdfPath)}`}
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              <Button variant="ghost" size="icon" className="h-8 w-8">
                                <FileDown className="h-4 w-4" />
                              </Button>
                            </a>
                          )}
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => handleResend(session.id)}
                            disabled={resendingId === session.id}
                          >
                            {resendingId === session.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Send className="h-4 w-4" />
                            )}
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between pt-4">
                  <p className="text-sm text-muted-foreground">
                    Page {page} of {totalPages}
                  </p>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      disabled={page === 1}
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                      disabled={page === totalPages}
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* View Session Dialog */}
      <Dialog open={!!fullReport} onOpenChange={(open) => !open && setFullReport(null)}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-auto">
          <DialogHeader>
            <DialogTitle>Assessment Details</DialogTitle>
          </DialogHeader>
          
          {fullReport && (
            <div className="space-y-6">
              <div className="grid gap-4 md:grid-cols-2 text-sm">
                <div>
                  <p className="text-muted-foreground">Tracker</p>
                  <p className="font-medium">{fullReport.tracker.name}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Program</p>
                  <p className="font-medium">{fullReport.tracker.programName}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Date</p>
                  <p className="font-medium">{formatDate(fullReport.session.assessmentDate)} (Day {fullReport.session.dayNumber})</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Submitted By</p>
                  <p className="font-medium">{fullReport.session.submittedByName}</p>
                </div>
              </div>

              <div className="rounded-md border overflow-hidden">
                <table className="w-full border-collapse text-sm">
                  <thead>
                    <tr className="bg-muted/50">
                      <th className="border-b border-r px-4 py-3 text-left font-semibold">Trainee</th>
                      {fullReport.criteria.map((c) => (
                        <th key={c.id} className="border-b px-2 py-3 text-center font-semibold">
                          <div>{c.title}</div>
                          {c.subtitle && <div className="text-[10px] font-normal opacity-70">{c.subtitle}</div>}
                        </th>
                      ))}
                      <th className="border-b px-3 py-3 text-center font-bold">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {fullReport.trainees.map((trainee) => (
                      <tr key={trainee.id} className="hover:bg-muted/30">
                        <td className="border-b border-r px-4 py-2 font-medium">
                          {trainee.name}
                        </td>
                        {fullReport.criteria.map((c) => (
                          <td key={c.id} className="border-b px-2 py-1 text-center">
                            <StarRating
                              value={scoreMap[trainee.id]?.[c.id] ?? 0}
                              min={fullReport.tracker.scoreMin}
                              max={fullReport.tracker.scoreMax}
                              readonly
                            />
                          </td>
                        ))}
                        <td className="border-b px-3 py-2 text-center font-bold">
                          {calculateRowTotal(trainee.id)}
                        </td>
                      </tr>
                    ))}
                    <tr className="bg-primary/5 font-semibold">
                      <td className="border-r px-4 py-2">Team Average</td>
                      {fullReport.criteria.map((c) => (
                        <td key={c.id} className="px-2 py-2 text-center">
                          {calculateTeamAverage(c.id)}
                        </td>
                      ))}
                      <td className="px-3 py-2 text-center font-bold text-primary">
                        {calculateGrandAverage()}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {fullReport.session.notes && (
                <div className="space-y-1">
                  <p className="text-sm font-semibold">Notes</p>
                  <p className="text-sm text-muted-foreground p-3 rounded-md bg-muted/30 border italic">
                    &quot;{fullReport.session.notes}&quot;
                  </p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}