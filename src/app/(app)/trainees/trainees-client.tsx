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
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, Loader2, Mail, ArrowLeft } from "lucide-react";
import { createTrainee, updateTrainee, deleteTrainee } from "@/actions/trainees";
import { formatDate } from "@/lib/utils";
import { EmptyState } from "@/components/shared/empty-state";
import { ConfirmationDialog } from "@/components/shared/confirmation-dialog";
import type { Trainee, ActionResult } from "@/types";

const traineeFormSchema = z.object({
  name: z.string().min(1, "Name is required"),
  employeeId: z.string().min(1, "Employee ID is required"),
  email: z.string().optional(),
  status: z.enum(["active", "inactive"]).optional(),
});

type TraineeFormData = z.infer<typeof traineeFormSchema>;

interface TraineesClientProps {
  trainees: Trainee[];
}

export function TraineesClient({ trainees }: TraineesClientProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Trainee | null>(null);
  const [loading, setLoading] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<TraineeFormData>({
    resolver: zodResolver(traineeFormSchema),
  });

  const openCreate = () => {
    setEditing(null);
    reset({ name: "", employeeId: "", email: "", status: "active" });
    setOpen(true);
  };

  const openEdit = (trainee: Trainee) => {
    setEditing(trainee);
    reset({
      name: trainee.name,
      employeeId: trainee.employeeId,
      email: trainee.email || "",
      status: trainee.status,
    });
    setOpen(true);
  };

  const onSubmit = async (data: TraineeFormData) => {
    setLoading(true);
    try {
      const formData = new FormData();
      formData.append("name", data.name);
      formData.append("employeeId", data.employeeId);
      formData.append("email", data.email || "");
      formData.append("status", data.status || "active");

      let result: ActionResult<Trainee>;
      if (editing) {
        result = await updateTrainee(editing.id, null, formData);
      } else {
        result = await createTrainee(null, formData);
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
    const result = await deleteTrainee(deleteId);
    if (result.success) {
      toast.success(result.message);
      setDeleteId(null);
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
        onClick={() => router.push("/dashboard")}
      >
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back to Dashboard
      </Button>

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Trainees</h1>
          <p className="text-muted-foreground">Manage all trainees</p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="mr-2 h-4 w-4" />
          New Trainee
        </Button>
      </div>

      {trainees.length === 0 ? (
        <EmptyState
          title="No trainees yet"
          description="Add trainees to start assigning them to trackers."
          actionLabel="Add Trainee"
          onAction={openCreate}
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {trainees.map((trainee) => (
            <Card key={trainee.id}>
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <CardTitle className="text-base">{trainee.name}</CardTitle>
                  <Badge variant={trainee.status === "active" ? "default" : "secondary"}>
                    {trainee.status}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  ID: {trainee.employeeId}
                </p>
                {trainee.email && (
                  <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                    <Mail className="h-3 w-3" />
                    {trainee.email}
                  </p>
                )}
                <div className="mt-3 flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => openEdit(trainee)}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-destructive"
                    onClick={() => setDeleteId(trainee.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? "Edit Trainee" : "Add Trainee"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input id="name" {...register("name")} placeholder="Full name" />
              {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="employeeId">Employee ID</Label>
              <Input id="employeeId" {...register("employeeId")} placeholder="EMP001" />
              {errors.employeeId && <p className="text-sm text-destructive">{errors.employeeId.message}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email (Optional)</Label>
              <Input id="email" type="email" {...register("email")} placeholder="trainee@example.com" />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : editing ? (
                "Update Trainee"
              ) : (
                "Add Trainee"
              )}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <ConfirmationDialog
        open={!!deleteId}
        onOpenChange={() => setDeleteId(null)}
        title="Delete Trainee"
        description="Are you sure you want to delete this trainee? This will also remove them from all trackers."
        onConfirm={handleDelete}
      />
    </div>
  );
}