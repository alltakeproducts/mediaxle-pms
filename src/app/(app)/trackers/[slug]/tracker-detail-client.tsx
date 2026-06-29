"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import {
  Plus,
  Pencil,
  Trash2,
  ArrowUp,
  ArrowDown,
  UserPlus,
  UserMinus,
  ClipboardCheck,
  Loader2,
  ArrowLeft,
} from "lucide-react";
import {
  createCriteria,
  updateCriteria,
  deleteCriteria,
  reorderCriteria,
} from "@/actions/criteria";
import {
  assignTraineeToTracker,
  removeTraineeFromTracker,
} from "@/actions/trainees";
import { formatDate } from "@/lib/utils";
import { EmptyState } from "@/components/shared/empty-state";
import { ConfirmationDialog } from "@/components/shared/confirmation-dialog";
import type { Tracker, Criteria, Trainee, AssessmentSession } from "@/types";

const criteriaSchema = z.object({
  title: z.string().min(1, "Title is required"),
  subtitle: z.string().optional(),
  maxScore: z.coerce.number().min(1, "Max score must be at least 1"),
});

type CriteriaFormData = z.infer<typeof criteriaSchema>;

interface TrackerDetailClientProps {
  tracker: Tracker;
  criteria: Criteria[];
  trainees: Trainee[];
  unassignedTrainees: Trainee[];
  todaysSession: AssessmentSession | null;
}

export function TrackerDetailClient({
  tracker,
  criteria: initialCriteria,
  trainees: initialTrainees,
  unassignedTrainees: initialUnassigned,
  todaysSession,
}: TrackerDetailClientProps) {
  const router = useRouter();
  const [criteriaList, setCriteriaList] = useState(initialCriteria);
  const [traineeList, setTraineeList] = useState(initialTrainees);
  const [unassignedList, setUnassignedList] = useState(initialUnassigned);
  const [criteriaOpen, setCriteriaOpen] = useState(false);
  const [editingCriteria, setEditingCriteria] = useState<Criteria | null>(null);
  const [loading, setLoading] = useState(false);
  const [deleteCriteriaId, setDeleteCriteriaId] = useState<string | null>(null);
  const [assignOpen, setAssignOpen] = useState(false);
  const [selectedTraineeId, setSelectedTraineeId] = useState("");

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CriteriaFormData>({
    resolver: zodResolver(criteriaSchema),
  });

  const openCriteriaCreate = () => {
    setEditingCriteria(null);
    reset({ title: "", subtitle: "", maxScore: tracker.scoreMax });
    setCriteriaOpen(true);
  };

  const openCriteriaEdit = (c: Criteria) => {
    setEditingCriteria(c);
    reset({ title: c.title, subtitle: c.subtitle || "", maxScore: c.maxScore });
    setCriteriaOpen(true);
  };

  const onCriteriaSubmit = async (data: CriteriaFormData) => {
    setLoading(true);
    try {
      const formData = new FormData();
      formData.append("trackerId", tracker.id);
      formData.append("title", data.title);
      formData.append("subtitle", data.subtitle || "");
      formData.append("maxScore", String(data.maxScore));

      let result;
      if (editingCriteria) {
        result = await updateCriteria(editingCriteria.id, null, formData);
      } else {
        result = await createCriteria(null, formData);
      }

      if (result.success) {
        toast.success(result.message || "Success!");
        setCriteriaOpen(false);
        router.refresh();
      } else {
        toast.error(result.error);
      }
    } catch {
      toast.error("Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteCriteria = async () => {
    if (!deleteCriteriaId) return;
    const result = await deleteCriteria(deleteCriteriaId, tracker.id);
    if (result.success) {
      toast.success(result.message);
      setDeleteCriteriaId(null);
      router.refresh();
    } else {
      toast.error(result.error);
    }
  };

  const handleReorder = async (id: string, direction: "up" | "down") => {
    const idx = criteriaList.findIndex((c) => c.id === id);
    if (idx === -1) return;
    const newList = [...criteriaList];
    const swapIdx = direction === "up" ? idx - 1 : idx + 1;
    if (swapIdx < 0 || swapIdx >= newList.length) return;

    [newList[idx], newList[swapIdx]] = [newList[swapIdx], newList[idx]];
    const reorderData = newList.map((c, i) => ({ id: c.id, sortOrder: i }));
    const result = await reorderCriteria(reorderData);
    if (result.success) {
      setCriteriaList(newList);
      router.refresh();
    } else {
      toast.error(result.error);
    }
  };

  const handleAssign = async () => {
    if (!selectedTraineeId) return;
    const result = await assignTraineeToTracker(selectedTraineeId, tracker.id);
    if (result.success) {
      toast.success(result.message);
      setAssignOpen(false);
      setSelectedTraineeId("");
      router.refresh();
    } else {
      toast.error(result.error);
    }
  };

  const handleRemoveTrainee = async (traineeId: string) => {
    const result = await removeTraineeFromTracker(traineeId, tracker.id);
    if (result.success) {
      toast.success(result.message);
      router.refresh();
    } else {
      toast.error(result.error);
    }
  };

  return (
    <div className="space-y-6">
      {/* Back Button */}
      <Button
        variant="ghost"
        size="sm"
        className="-ml-2 h-8 text-muted-foreground hover:text-foreground"
        onClick={() => router.push("/trackers")}
      >
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back to Trackers
      </Button>

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <div
              className="h-4 w-4 rounded-full"
              style={{ backgroundColor: tracker.themeColor }}
            />
            <h1 className="text-2xl font-bold tracking-tight">{tracker.name}</h1>
            <Badge variant={tracker.status === "enabled" ? "default" : "secondary"}>
              {tracker.status}
            </Badge>
          </div>
          <p className="text-muted-foreground mt-1">{tracker.programName}</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={() => router.push(`/assessments?trackerId=${tracker.id}`)}
          >
            <ClipboardCheck className="mr-2 h-4 w-4" />
            Assess
          </Button>
        </div>
      </div>

      {/* Info Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Score Range</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-lg font-bold">
              {tracker.scoreMin} – {tracker.scoreMax}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Trainees</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-lg font-bold">{traineeList.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Criteria</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-lg font-bold">{criteriaList.length}</p>
          </CardContent>
        </Card>
      </div>

      {/* Criteria Section */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-sm font-medium">Assessment Criteria</CardTitle>
          <Button size="sm" onClick={openCriteriaCreate}>
            <Plus className="mr-2 h-4 w-4" />
            Add Criteria
          </Button>
        </CardHeader>
        <CardContent>
          {criteriaList.length === 0 ? (
            <EmptyState
              title="No criteria yet"
              description="Add assessment criteria for this tracker."
              actionLabel="Add Criteria"
              onAction={openCriteriaCreate}
            />
          ) : (
            <div className="space-y-2">
              {criteriaList.map((c, idx) => (
                <div
                  key={c.id}
                  className="flex items-center justify-between rounded-lg border p-3"
                >
                  <div className="flex-1">
                    <p className="text-sm font-medium">{c.title}</p>
                    {c.subtitle && (
                      <p className="text-xs text-muted-foreground">{c.subtitle}</p>
                    )}
                    <p className="text-xs text-muted-foreground mt-1">
                      Max Score: {c.maxScore} • Order: {c.sortOrder}
                    </p>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => handleReorder(c.id, "up")}
                      disabled={idx === 0}
                    >
                      <ArrowUp className="h-3 w-3" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => handleReorder(c.id, "down")}
                      disabled={idx === criteriaList.length - 1}
                    >
                      <ArrowDown className="h-3 w-3" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => openCriteriaEdit(c)}
                    >
                      <Pencil className="h-3 w-3" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-destructive"
                      onClick={() => setDeleteCriteriaId(c.id)}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Trainees Section */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-sm font-medium">Assigned Trainees</CardTitle>
          <Button
            size="sm"
            onClick={() => setAssignOpen(true)}
            disabled={unassignedList.length === 0}
          >
            <UserPlus className="mr-2 h-4 w-4" />
            Assign Trainee
          </Button>
        </CardHeader>
        <CardContent>
          {traineeList.length === 0 ? (
            <EmptyState
              title="No trainees assigned"
              description="Assign trainees to this tracker to begin assessments."
            />
          ) : (
            <div className="space-y-2">
              {traineeList.map((trainee) => (
                <div
                  key={trainee.id}
                  className="flex items-center justify-between rounded-lg border p-3"
                >
                  <div>
                    <p className="text-sm font-medium">{trainee.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {trainee.employeeId} {trainee.email ? `• ${trainee.email}` : ""}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-destructive"
                    onClick={() => handleRemoveTrainee(trainee.id)}
                  >
                    <UserMinus className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Criteria Dialog */}
      <Dialog open={criteriaOpen} onOpenChange={setCriteriaOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingCriteria ? "Edit Criteria" : "Add Criteria"}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit(onCriteriaSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="title">Title</Label>
              <Input id="title" {...register("title")} placeholder="e.g. Schedule" />
              {errors.title && (
                <p className="text-sm text-destructive">{errors.title.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="subtitle">Subtitle (Optional)</Label>
              <Input
                id="subtitle"
                {...register("subtitle")}
                placeholder="e.g. Punctuality & attendance"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="maxScore">Max Score</Label>
              <Input
                id="maxScore"
                type="number"
                {...register("maxScore")}
                defaultValue={tracker.scoreMax}
              />
              {errors.maxScore && (
                <p className="text-sm text-destructive">
                  {errors.maxScore.message}
                </p>
              )}
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : editingCriteria ? (
                "Update Criteria"
              ) : (
                "Add Criteria"
              )}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* Assign Trainee Dialog */}
      <Dialog open={assignOpen} onOpenChange={setAssignOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Assign Trainee</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Select Trainee</Label>
              <Select
                value={selectedTraineeId}
                onValueChange={setSelectedTraineeId}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Choose a trainee..." />
                </SelectTrigger>
                <SelectContent>
                  {unassignedList.map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.name} ({t.employeeId})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button
              className="w-full"
              onClick={handleAssign}
              disabled={!selectedTraineeId}
            >
              Assign
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Criteria Confirmation */}
      <ConfirmationDialog
        open={!!deleteCriteriaId}
        onOpenChange={() => setDeleteCriteriaId(null)}
        title="Delete Criteria"
        description="Are you sure you want to delete this criteria? This action cannot be undone."
        onConfirm={handleDeleteCriteria}
      />
    </div>
  );
}