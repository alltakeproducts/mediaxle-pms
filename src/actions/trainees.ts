"use server";

import "server-only";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { connectToDatabase } from "@/lib/db";
import { TraineeModel, TrackerAssignmentModel, TrackerModel } from "@/models";
import { requireSession } from "@/lib/auth";
import type { ActionResult, Trainee } from "@/types";

const traineeSchema = z.object({
  name: z.string().min(1, "Name is required"),
  employeeId: z.string().min(1, "Employee ID is required"),
  email: z.string().email("Invalid email").optional().or(z.literal("")),
  status: z.enum(["active", "inactive"]).optional(),
});

export type TraineeFormInput = z.infer<typeof traineeSchema>;

function toTrainee(doc: Record<string, unknown>): Trainee {
  return {
    id: String(doc._id),
    name: String(doc.name),
    employeeId: String(doc.employeeId),
    email: String(doc.email || ""),
    status: (doc.status as "active" | "inactive") || "active",
    createdAt: String(doc.createdAt || ""),
    updatedAt: String(doc.updatedAt || ""),
  };
}

export async function getTrainees(): Promise<Trainee[]> {
  await requireSession();
  await connectToDatabase();
  const docs = await TraineeModel.find().sort({ name: 1 }).lean();
  return docs.map((d) => toTrainee(d as unknown as Record<string, unknown>));
}

export async function getTraineesByTracker(trackerId: string): Promise<Trainee[]> {
  await requireSession();
  await connectToDatabase();
  const assignments = await TrackerAssignmentModel.find({ trackerId }).lean();
  const traineeIds = assignments.map((a) => a.traineeId);
  const docs = await TraineeModel.find({ _id: { $in: traineeIds }, status: "active" })
    .sort({ name: 1 })
    .lean();
  return docs.map((d) => toTrainee(d as unknown as Record<string, unknown>));
}

export async function getUnassignedTrainees(trackerId: string): Promise<Trainee[]> {
  await requireSession();
  await connectToDatabase();
  const assignments = await TrackerAssignmentModel.find({ trackerId }).lean();
  const assignedIds = assignments.map((a) => a.traineeId);
  const docs = await TraineeModel.find({ _id: { $nin: assignedIds }, status: "active" })
    .sort({ name: 1 })
    .lean();
  return docs.map((d) => toTrainee(d as unknown as Record<string, unknown>));
}

export async function createTrainee(
  _prev: ActionResult<Trainee> | null,
  formData: FormData,
): Promise<ActionResult<Trainee>> {
  await requireSession();
  const parsed = traineeSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return {
      success: false,
      error: "Please correct the errors below.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  try {
    await connectToDatabase();
    const data = parsed.data;
    const existing = await TraineeModel.findOne({ employeeId: data.employeeId });
    if (existing) {
      return { success: false, error: "A trainee with this Employee ID already exists." };
    }

    const doc = await TraineeModel.create({
      name: data.name,
      employeeId: data.employeeId,
      email: data.email || "",
      status: data.status || "active",
    });

    revalidatePath("/trainees");
    return {
      success: true,
      data: toTrainee(doc.toObject()),
      message: "Trainee created successfully.",
    };
  } catch (error) {
    console.error("[createTrainee]", error);
    return { success: false, error: "Failed to create trainee." };
  }
}

export async function updateTrainee(
  id: string,
  _prev: ActionResult<Trainee> | null,
  formData: FormData,
): Promise<ActionResult<Trainee>> {
  await requireSession();
  const parsed = traineeSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return {
      success: false,
      error: "Please correct the errors below.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  try {
    await connectToDatabase();
    const data = parsed.data;
    const doc = await TraineeModel.findByIdAndUpdate(
      id,
      {
        name: data.name,
        employeeId: data.employeeId,
        email: data.email || "",
        status: data.status || "active",
      },
      { new: true },
    );
    if (!doc) return { success: false, error: "Trainee not found." };

    revalidatePath("/trainees");
    return {
      success: true,
      data: toTrainee(doc.toObject()),
      message: "Trainee updated successfully.",
    };
  } catch (error) {
    console.error("[updateTrainee]", error);
    return { success: false, error: "Failed to update trainee." };
  }
}

export async function deleteTrainee(id: string): Promise<ActionResult> {
  await requireSession();
  try {
    await connectToDatabase();
    await TraineeModel.findByIdAndDelete(id);
    await TrackerAssignmentModel.deleteMany({ traineeId: id });
    revalidatePath("/trainees");
    return { success: true, message: "Trainee deleted successfully." };
  } catch (error) {
    console.error("[deleteTrainee]", error);
    return { success: false, error: "Failed to delete trainee." };
  }
}

export async function assignTraineeToTracker(
  traineeId: string,
  trackerId: string,
): Promise<ActionResult> {
  await requireSession();
  try {
    await connectToDatabase();
    const tracker = await TrackerModel.findById(trackerId).lean();
    if (!tracker) return { success: false, error: "Tracker not found." };

    const existing = await TrackerAssignmentModel.findOne({ trackerId, traineeId });
    if (existing) {
      return { success: false, error: "Trainee is already assigned to this tracker." };
    }
    await TrackerAssignmentModel.create({ trackerId, traineeId });
    
    revalidatePath("/trackers");
    revalidatePath(`/trackers/${tracker.slug}`);
    return { success: true, message: "Trainee assigned successfully." };
  } catch (error) {
    console.error("[assignTraineeToTracker]", error);
    return { success: false, error: "Failed to assign trainee." };
  }
}

export async function removeTraineeFromTracker(
  traineeId: string,
  trackerId: string,
): Promise<ActionResult> {
  await requireSession();
  try {
    await connectToDatabase();
    const tracker = await TrackerModel.findById(trackerId).lean();
    if (!tracker) return { success: false, error: "Tracker not found." };

    await TrackerAssignmentModel.deleteOne({ trackerId, traineeId });
    
    revalidatePath("/trackers");
    revalidatePath(`/trackers/${tracker.slug}`);
    return { success: true, message: "Trainee removed from tracker." };
  } catch (error) {
    console.error("[removeTraineeFromTracker]", error);
    return { success: false, error: "Failed to remove trainee." };
  }
}