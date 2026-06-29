"use server";

import "server-only";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { connectToDatabase } from "@/lib/db";
import { TrackerModel } from "@/models";
import { slugify } from "@/lib/utils";
import { requireSession } from "@/lib/auth";
import type { ActionResult, Tracker, TrackerStatus } from "@/types";

const trackerSchema = z.object({
  name: z.string().min(1, "Name is required"),
  programName: z.string().min(1, "Program name is required"),
  description: z.string().optional(),
  themeColor: z.string().optional(),
  logo: z.string().optional(),
  scoreMin: z.coerce.number().min(0),
  scoreMax: z.coerce.number().min(1),
  submissionDeadline: z.string().optional(),
  emailRecipients: z.string().optional(),
  status: z.enum(["enabled", "disabled"]).optional(),
});

export type TrackerFormInput = z.infer<typeof trackerSchema>;

function serializeId(value: unknown): string {
  if (value == null) return "";
  if (typeof value === "string") return value;
  if (typeof value === "object" && typeof (value as { toString: () => string }).toString === "function") {
    return (value as { toString: () => string }).toString();
  }
  return String(value);
}

function serializeDate(value: unknown): string {
  if (value == null) return "";
  if (value instanceof Date) return value.toISOString();
  return String(value);
}

function toTracker(doc: Record<string, unknown>): Tracker {
  return {
    id: serializeId(doc._id),
    name: String(doc.name ?? ""),
    slug: String(doc.slug ?? ""),
    programName: String(doc.programName ?? ""),
    description: String(doc.description ?? ""),
    themeColor: String(doc.themeColor ?? "#4f46e5"),
    logo: String(doc.logo ?? ""),
    scoreMin: Number(doc.scoreMin ?? 0),
    scoreMax: Number(doc.scoreMax ?? 5),
    submissionDeadline: String(doc.submissionDeadline ?? ""),
    emailRecipients: Array.isArray(doc.emailRecipients) ? doc.emailRecipients.map(String) : [],
    status: (doc.status as TrackerStatus) || "enabled",
    createdAt: serializeDate(doc.createdAt),
    updatedAt: serializeDate(doc.updatedAt),
  };
}

export async function getTrackers(): Promise<Tracker[]> {
  await requireSession();
  await connectToDatabase();
  const docs = await TrackerModel.find().sort({ createdAt: -1 }).lean();
  return docs.map((d) => toTracker(d as unknown as Record<string, unknown>));
}

export async function getTracker(slug: string): Promise<Tracker | null> {
  await requireSession();
  await connectToDatabase();
  const doc = await TrackerModel.findOne({ slug }).lean();
  if (!doc) return null;
  return toTracker(doc as unknown as Record<string, unknown>);
}

export async function getTrackerById(id: string): Promise<Tracker | null> {
  await requireSession();
  await connectToDatabase();
  const doc = await TrackerModel.findById(id).lean();
  if (!doc) return null;
  return toTracker(doc as unknown as Record<string, unknown>);
}

export async function createTracker(
  _prev: ActionResult<Tracker> | null,
  formData: FormData,
): Promise<ActionResult<Tracker>> {
  const session = await requireSession();
  const parsed = trackerSchema.safeParse(Object.fromEntries(formData));
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
    const slug = slugify(data.name);
    const existing = await TrackerModel.findOne({ slug });
    if (existing) {
      return { success: false, error: "A tracker with this name already exists." };
    }

    const recipients = data.emailRecipients
      ? data.emailRecipients.split(/[\n,;]+/).map((e) => e.trim()).filter(Boolean)
      : [];

    const doc = await TrackerModel.create({
      name: data.name,
      slug,
      programName: data.programName,
      description: data.description || "",
      themeColor: data.themeColor || "#4f46e5",
      logo: data.logo || "",
      scoreMin: data.scoreMin,
      scoreMax: data.scoreMax,
      submissionDeadline: data.submissionDeadline || "",
      emailRecipients: recipients,
      status: data.status || "enabled",
    });

    revalidatePath("/trackers");
    return {
      success: true,
      data: toTracker(doc.toObject()),
      message: "Tracker created successfully.",
    };
  } catch (error) {
    console.error("[createTracker]", error);
    return { success: false, error: "Failed to create tracker." };
  }
}

export async function updateTracker(
  id: string,
  _prev: ActionResult<Tracker> | null,
  formData: FormData,
): Promise<ActionResult<Tracker>> {
  await requireSession();
  const parsed = trackerSchema.safeParse(Object.fromEntries(formData));
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
    const slug = slugify(data.name);

    const recipients = data.emailRecipients
      ? data.emailRecipients.split(/[\n,;]+/).map((e) => e.trim()).filter(Boolean)
      : [];

    const doc = await TrackerModel.findByIdAndUpdate(
      id,
      {
        name: data.name,
        slug,
        programName: data.programName,
        description: data.description || "",
        themeColor: data.themeColor || "#4f46e5",
        logo: data.logo || "",
        scoreMin: data.scoreMin,
        scoreMax: data.scoreMax,
        submissionDeadline: data.submissionDeadline || "",
        emailRecipients: recipients,
        status: data.status || "enabled",
      },
      { new: true },
    );

    if (!doc) {
      return { success: false, error: "Tracker not found." };
    }

    revalidatePath("/trackers");
    revalidatePath(`/trackers/${doc.slug}`);
    return {
      success: true,
      data: toTracker(doc.toObject()),
      message: "Tracker updated successfully.",
    };
  } catch (error) {
    console.error("[updateTracker]", error);
    return { success: false, error: "Failed to update tracker." };
  }
}

export async function deleteTracker(id: string): Promise<ActionResult> {
  await requireSession();
  try {
    await connectToDatabase();
    await TrackerModel.findByIdAndDelete(id);
    revalidatePath("/trackers");
    return { success: true, message: "Tracker deleted successfully." };
  } catch (error) {
    console.error("[deleteTracker]", error);
    return { success: false, error: "Failed to delete tracker." };
  }
}

export async function toggleTrackerStatus(id: string, status: TrackerStatus): Promise<ActionResult> {
  await requireSession();
  try {
    await connectToDatabase();
    await TrackerModel.findByIdAndUpdate(id, { status });
    revalidatePath("/trackers");
    return { success: true, message: `Tracker ${status === "enabled" ? "enabled" : "disabled"} successfully.` };
  } catch (error) {
    console.error("[toggleTrackerStatus]", error);
    return { success: false, error: "Failed to update tracker status." };
  }
}