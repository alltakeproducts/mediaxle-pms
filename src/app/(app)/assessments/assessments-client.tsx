"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import {
  Loader2,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  CheckCircle2,
  Pencil,
  Search,
  ArrowLeft,
} from "lucide-react";
import {
  getTraineesByTracker,
} from "@/actions/trainees";
import { getCriteriaByTracker } from "@/actions/criteria";
import { getTodaysSession, submitAssessment, getScoresBySession } from "@/actions/assessments";
import { cn } from "@/lib/utils";
import { StarRating } from "@/components/shared/star-rating";
import type { Tracker, Criteria, Trainee, AssessmentSession } from "@/types";

interface AssessmentsClientProps {
  trackers: Tracker[];
}

type ScoreMap = Record<string, Record<string, number>>; // traineeId -> criteriaId -> score

export function AssessmentsClient({ trackers }: AssessmentsClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const trackerIdParam = searchParams.get("trackerId");

  const [selectedTrackerId, setSelectedTrackerId] = useState(trackerIdParam || "");
  const [trainees, setTrainees] = useState<Trainee[]>([]);
  const [criteria, setCriteria] = useState<Criteria[]>([]);
  const [scores, setScores] = useState<ScoreMap>({});
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [todaysSession, setTodaysSession] = useState<AssessmentSession | null>(null);
  const [initialScores, setInitialScores] = useState<ScoreMap>({});
  const [isEditing, setIsEditing] = useState(false);
  const [trackerSearch, setTrackerSearch] = useState("");

  const filteredTrackers = useMemo(() => {
    return trackers
      .filter((t) => t.status === "enabled")
      .filter((t) => 
        t.name.toLowerCase().includes(trackerSearch.toLowerCase()) ||
        t.programName.toLowerCase().includes(trackerSearch.toLowerCase())
      );
  }, [trackers, trackerSearch]);

  const hasChanges = useMemo(() => {
    return JSON.stringify(scores) !== JSON.stringify(initialScores);
  }, [scores, initialScores]);

  // Load tracker data
  useEffect(() => {
    if (!selectedTrackerId) {
      setTrainees([]);
      setCriteria([]);
      setScores({});
      setTodaysSession(null);
      setNotes("");
      setIsEditing(false);
      return;
    }

    const loadData = async () => {
      setLoading(true);
      try {
        const [traineesData, criteriaData, sessionData] = await Promise.all([
          getTraineesByTracker(selectedTrackerId),
          getCriteriaByTracker(selectedTrackerId),
          getTodaysSession(selectedTrackerId),
        ]);

        setTrainees(traineesData);
        setCriteria(criteriaData);
        setTodaysSession(sessionData ?? null);
        setNotes(sessionData?.notes || "");
        setIsEditing(false);

        // Initialize scores
        const initial: ScoreMap = {};
        
        if (sessionData) {
          const existingScores = await getScoresBySession(sessionData.id);
          for (const trainee of traineesData) {
            initial[trainee.id] = {};
            for (const c of criteriaData) {
              const s = existingScores.find(es => es.traineeId === trainee.id && es.criteriaId === c.id);
              initial[trainee.id][c.id] = s ? s.score : 0;
            }
          }
        } else {
          for (const trainee of traineesData) {
            initial[trainee.id] = {};
            for (const c of criteriaData) {
              initial[trainee.id][c.id] = 0;
            }
          }
        }
        
        setScores(initial);
        setInitialScores(JSON.parse(JSON.stringify(initial)));
      } catch {
        toast.error("Failed to load assessment data.");
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [selectedTrackerId]);

  const handleScoreChange = useCallback(
    (traineeId: string, criteriaId: string, value: number) => {
      setScores((prev) => ({
        ...prev,
        [traineeId]: {
          ...prev[traineeId],
          [criteriaId]: value,
        },
      }));
    },
    [],
  );

  const calculateRowTotal = useCallback(
    (traineeId: string) => {
      const traineeScores = scores[traineeId] || {};
      return Object.values(traineeScores).reduce((sum, s) => sum + s, 0);
    },
    [scores],
  );

  const calculateTeamAverage = useCallback(
    (criteriaId: string) => {
      const values = trainees.map((t) => scores[t.id]?.[criteriaId] ?? 0);
      const sum = values.reduce((a, b) => a + b, 0);
      return trainees.length > 0 ? (sum / trainees.length).toFixed(1) : "0";
    },
    [scores, trainees],
  );

  const calculateGrandAverage = useCallback(() => {
    const totals = trainees.map((t) => calculateRowTotal(t.id));
    const sum = totals.reduce((a, b) => a + b, 0);
    return trainees.length > 0 ? (sum / trainees.length).toFixed(1) : "0";
  }, [calculateRowTotal, trainees]);

  const handleSubmit = async () => {
    if (!selectedTrackerId) return;

    // Validate all scores are filled
    for (const trainee of trainees) {
      for (const c of criteria) {
        if (scores[trainee.id]?.[c.id] === undefined) {
          toast.error("Please fill all scores before submitting.");
          return;
        }
      }
    }

    setSubmitting(true);
    try {
      const result = await submitAssessment({
        trackerId: selectedTrackerId,
        scores,
        notes,
      });

      if (result.success) {
        toast.success(result.message || "Assessment submitted successfully!");
        setTodaysSession(result.success ? (result.data as AssessmentSession) : null);
        setSubmitting(false);
        router.refresh();
      } else {
        toast.error(result.error);
        setSubmitting(false);
      }
    } catch {
      toast.error("Failed to submit assessment.");
      setSubmitting(false);
    }
  };

  const selectedTracker = trackers.find((t) => t.id === selectedTrackerId);

  if (trackers.length === 0) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Assessments</h1>
          <p className="text-muted-foreground">
            Create a tracker first to start assessing trainees.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Back Button */}
      {selectedTrackerId && (
        <Button
          variant="ghost"
          size="sm"
          className="-ml-2 h-8 text-muted-foreground hover:text-foreground"
          onClick={() => {
            setSelectedTrackerId("");
            router.replace("/assessments");
          }}
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Selection
        </Button>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            {selectedTracker ? `Assess: ${selectedTracker.name}` : "Daily Assessment"}
          </h1>
          <p className="text-muted-foreground">
            {selectedTracker ? selectedTracker.programName : "Select a tracker to start assessing trainees"}
          </p>
        </div>
      </div>

      {/* Tracker Selection Table (only if none selected) */}
      {!selectedTrackerId && (
        <Card>
          <CardHeader className="pb-3">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search trackers..."
                className="pl-9"
                value={trackerSearch}
                onChange={(e) => setTrackerSearch(e.target.value)}
              />
            </div>
          </CardHeader>
          <CardContent className="p-0 border-t">
            <div className="overflow-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-muted/50">
                    <th className="px-4 py-3 text-left font-semibold">Tracker Name</th>
                    <th className="px-4 py-3 text-left font-semibold">Program</th>
                    <th className="px-4 py-3 text-center font-semibold">Score Range</th>
                    <th className="px-4 py-3 text-right font-semibold">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {filteredTrackers.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-4 py-8 text-center text-muted-foreground">
                        No trackers found matching your search.
                      </td>
                    </tr>
                  ) : (
                    filteredTrackers.map((t) => (
                      <tr key={t.id} className="hover:bg-muted/30">
                        <td className="px-4 py-3 font-medium">{t.name}</td>
                        <td className="px-4 py-3 text-muted-foreground">{t.programName}</td>
                        <td className="px-4 py-3 text-center">{t.scoreMin} – {t.scoreMax}</td>
                        <td className="px-4 py-3 text-right">
                          <Button 
                            size="sm" 
                            onClick={() => {
                              setSelectedTrackerId(t.id);
                              router.replace(`/assessments?trackerId=${t.id}`);
                            }}
                          >
                            Select
                          </Button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Status / Info */}
      {todaysSession && !isEditing && (
        <Card className="border-green-200 bg-green-50">
          <CardContent className="flex items-center justify-between py-4">
            <div className="flex items-center gap-3">
              <CheckCircle2 className="h-5 w-5 text-green-600" />
              <div>
                <p className="text-sm font-medium text-green-800">
                  Assessment already submitted for today
                </p>
                <p className="text-xs text-green-600">
                  Day {todaysSession.dayNumber} • Submitted by {todaysSession.submittedByName}
                </p>
              </div>
            </div>
            <Button variant="outline" size="sm" onClick={() => setIsEditing(true)}>
              <Pencil className="mr-2 h-4 w-4" />
              Edit Assessment
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      )}

      {/* Unsaved Changes Indicator */}
      {hasChanges && (!todaysSession || isEditing) && (
        <div className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-2 text-sm text-amber-800">
          <AlertCircle className="h-4 w-4" />
          You have unsaved changes
        </div>
      )}

      {/* Assessment Matrix */}
      {!loading && selectedTrackerId && trainees.length > 0 && criteria.length > 0 && (!todaysSession || isEditing) && (
        <Card>
          <CardContent className="p-0">
            <div className="overflow-auto scrollbar-thin" style={{ maxHeight: "calc(100vh - 400px)" }}>
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr>
                    <th className="sticky left-0 top-0 z-20 min-w-[180px] border-b bg-white px-4 py-3 text-left text-xs font-semibold uppercase text-muted-foreground shadow-sm">
                      Trainee
                    </th>
                    {criteria.map((c) => (
                      <th
                        key={c.id}
                        className="sticky top-0 z-10 min-w-[100px] border-b bg-white px-3 py-3 text-center text-xs font-semibold uppercase text-muted-foreground shadow-sm"
                      >
                        <div>{c.title}</div>
                        {c.subtitle && (
                          <div className="text-[10px] font-normal text-muted-foreground/70">
                            {c.subtitle}
                          </div>
                        )}
                      </th>
                    ))}
                    <th className="sticky top-0 z-10 min-w-[80px] border-b bg-white px-3 py-3 text-center text-xs font-semibold uppercase text-muted-foreground shadow-sm">
                      Total
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {trainees.map((trainee) => (
                    <tr key={trainee.id} className="group hover:bg-muted/30">
                      <td className="sticky left-0 z-10 border-b border-r bg-white px-4 py-2 font-medium shadow-sm group-hover:bg-muted/30">
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-muted-foreground">
                            {trainee.employeeId}
                          </span>
                          <span>{trainee.name}</span>
                        </div>
                      </td>
                      {criteria.map((c) => {
                        const score = scores[trainee.id]?.[c.id] ?? 0;
                        return (
                          <td
                            key={c.id}
                            className="border-b px-2 py-1 text-center"
                          >
                            <StarRating
                              value={score}
                              min={selectedTracker?.scoreMin}
                              max={selectedTracker?.scoreMax}
                              onChange={(val) =>
                                handleScoreChange(trainee.id, c.id, val)
                              }
                            />
                          </td>
                        );
                      })}
                      <td className="border-b px-3 py-2 text-center font-bold">
                        {calculateRowTotal(trainee.id)}
                      </td>
                    </tr>
                  ))}
                  {/* Team Average Row */}
                  <tr className="bg-primary/5">
                    <td className="sticky left-0 z-10 border-b border-r bg-primary/5 px-4 py-2 font-semibold shadow-sm">
                      Team Average
                    </td>
                    {criteria.map((c) => (
                      <td
                        key={c.id}
                        className="border-b px-3 py-2 text-center font-semibold"
                      >
                        {calculateTeamAverage(c.id)}
                      </td>
                    ))}
                    <td className="border-b px-3 py-2 text-center font-bold text-primary">
                      {calculateGrandAverage()}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Notes & Submit */}
      {!loading && selectedTrackerId && trainees.length > 0 && (!todaysSession || isEditing) && (
        <Card>
          <CardContent className="space-y-4 pt-6">
            <div className="space-y-2">
              <Label htmlFor="notes">Notes (Optional)</Label>
              <Textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Any additional notes..."
                rows={2}
              />
            </div>
            <Button
              onClick={handleSubmit}
              disabled={submitting || trainees.length === 0 || criteria.length === 0}
              className="w-full"
              size="lg"
            >
              {submitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {todaysSession ? "Updating..." : "Submitting..."}
                </>
              ) : (
                todaysSession ? "Update Assessment" : "Submit Assessment"
              )}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Empty States */}
      {!loading && selectedTrackerId && trainees.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">
              No trainees assigned to this tracker.
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              Assign trainees from the tracker detail page.
            </p>
          </CardContent>
        </Card>
      )}

      {!loading && selectedTrackerId && criteria.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">
              No criteria configured for this tracker.
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              Add criteria from the tracker detail page.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}