"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
import { Plus, Pencil, Trash2, ToggleLeft, ToggleRight, Loader2, ArrowLeft } from "lucide-react";
import { createTracker, updateTracker, deleteTracker, toggleTrackerStatus } from "@/actions/trackers";
import { THEME_COLOR_PRESETS } from "@/constants";
import { formatDate } from "@/lib/utils";
import { EmptyState } from "@/components/shared/empty-state";
import { ConfirmationDialog } from "@/components/shared/confirmation-dialog";
import type { Tracker, TrackerStatus, ActionResult } from "@/types";

const trackerFormSchema = z.object({
  name: z.string().min(1, "Name is required"),
  programName: z.string().min(1, "Program name is required"),
  description: z.string().optional(),
  themeColor: z.string().optional(),
  scoreMin: z.coerce.number().min(0),
  scoreMax: z.coerce.number().min(1),
  submissionDeadline: z.string().optional(),
  emailRecipients: z.string().optional(),
});

type TrackerFormData = z.infer<typeof trackerFormSchema>;

interface TrackersClientProps {
  trackers: Tracker[];
}

export function TrackersClient({ trackers }: TrackersClientProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Tracker | null>(null);
  const [loading, setLoading] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<TrackerFormData>({
    resolver: zodResolver(trackerFormSchema),
    defaultValues: {
      scoreMin: 0,
      scoreMax: 5,
      themeColor: "#4f46e5",
    },
  });

  const selectedColor = watch("themeColor");

  const openCreate = () => {
    setEditing(null);
    reset({ scoreMin: 0, scoreMax: 5, themeColor: "#4f46e5", name: "", programName: "", description: "", emailRecipients: "", submissionDeadline: "" });
    setOpen(true);
  };

  const openEdit = (tracker: Tracker) => {
    setEditing(tracker);
    reset({
      name: tracker.name || "",
      programName: tracker.programName || "",
      description: tracker.description || "",
      themeColor: tracker.themeColor || "#4f46e5",
      scoreMin: tracker.scoreMin ?? 0,
      scoreMax: tracker.scoreMax ?? 5,
      submissionDeadline: tracker.submissionDeadline || "",
      emailRecipients: Array.isArray(tracker.emailRecipients) ? tracker.emailRecipients.join("\n") : "",
    });
    setOpen(true);
  };

  const onSubmit = async (data: TrackerFormData) => {
    setLoading(true);
    try {
      const formData = new FormData();
      Object.entries(data).forEach(([key, value]) => {
        if (value !== undefined) formData.append(key, String(value));
      });

      let result: ActionResult<Tracker>;
      if (editing) {
        result = await updateTracker(editing.id, null, formData);
      } else {
        result = await createTracker(null, formData);
      }

      if (result.success) {
        toast.success(result.message || "Success!");
        setOpen(false);
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

  const handleDelete = async () => {
    if (!deleteId) return;
    const result = await deleteTracker(deleteId);
    if (result.success) {
      toast.success(result.message);
      setDeleteId(null);
      router.refresh();
    } else {
      toast.error(result.error);
    }
  };

  const handleToggle = async (id: string, status: TrackerStatus) => {
    const newStatus = status === "enabled" ? "disabled" : "enabled";
    const result = await toggleTrackerStatus(id, newStatus);
    if (result.success) {
      toast.success(result.message);
      router.refresh();
    } else {
      toast.error(result.error);
    }
  };

  const validTrackers = trackers.filter((t) => t.id && t.name);

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

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Trackers</h1>
          <p className="text-muted-foreground">Manage assessment trackers</p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="mr-2 h-4 w-4" />
          New Tracker
        </Button>
      </div>

      {validTrackers.length === 0 ? (
        <EmptyState
          title="No trackers yet"
          description="Create your first tracker to start assessing trainees."
          actionLabel="Create Tracker"
          onAction={openCreate}
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {validTrackers.map((tracker) => (
            <Card
              key={tracker.id}
              className="cursor-pointer transition-shadow hover:shadow-md"
              onClick={() => router.push(`/trackers/${tracker.slug}`)}
            >
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <div
                      className="h-3 w-3 rounded-full"
                      style={{ backgroundColor: tracker.themeColor }}
                    />
                    <CardTitle className="text-base">{tracker.name}</CardTitle>
                  </div>
                  <Badge variant={tracker.status === "enabled" ? "default" : "secondary"}>
                    {tracker.status}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
                  {tracker.description || tracker.programName}
                </p>
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>Score: {tracker.scoreMin}–{tracker.scoreMax}</span>
                  <span>{tracker.createdAt ? new Date(tracker.createdAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : "—"}</span>
                </div>
                <div className="mt-3 flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={(e) => {
                      e.stopPropagation();
                      openEdit(tracker);
                    }}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleToggle(tracker.id, tracker.status);
                    }}
                  >
                    {tracker.status === "enabled" ? (
                      <ToggleRight className="h-4 w-4" />
                    ) : (
                      <ToggleLeft className="h-4 w-4" />
                    )}
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-destructive"
                    onClick={(e) => {
                      e.stopPropagation();
                      setDeleteId(tracker.id);
                    }}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit Tracker" : "Create Tracker"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Tracker Name</Label>
              <Input id="name" {...register("name")} placeholder="e.g. Sales Assessment" />
              {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="programName">Program Name</Label>
              <Input id="programName" {...register("programName")} placeholder="e.g. Sales Training Program" />
              {errors.programName && <p className="text-sm text-destructive">{errors.programName.message}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea id="description" {...register("description")} placeholder="Optional description" />
            </div>
            <div className="space-y-2">
              <Label>Theme Color</Label>
              <div className="flex flex-wrap gap-2">
                {THEME_COLOR_PRESETS.map((color) => (
                  <button
                    key={color}
                    type="button"
                    className={`h-8 w-8 rounded-full border-2 transition-all ${
                      selectedColor === color ? "border-foreground scale-110" : "border-transparent"
                    }`}
                    style={{ backgroundColor: color }}
                    onClick={() => setValue("themeColor", color)}
                  />
                ))}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="scoreMin">Min Score</Label>
                <Input id="scoreMin" type="number" {...register("scoreMin")} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="scoreMax">Max Score</Label>
                <Input id="scoreMax" type="number" {...register("scoreMax")} />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="submissionDeadline">Submission Deadline (HH:mm)</Label>
              <Input id="submissionDeadline" {...register("submissionDeadline")} placeholder="e.g. 17:00" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="emailRecipients">Email Recipients</Label>
              <Textarea
                id="emailRecipients"
                {...register("emailRecipients")}
                placeholder="One email per line"
                rows={3}
              />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                editing ? "Update Tracker" : "Create Tracker"
              )}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      <ConfirmationDialog
        open={!!deleteId}
        onOpenChange={() => setDeleteId(null)}
        title="Delete Tracker"
        description="Are you sure you want to delete this tracker? This action cannot be undone."
        onConfirm={handleDelete}
      />
    </div>
  );
}