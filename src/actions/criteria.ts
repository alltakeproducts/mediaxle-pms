"use server";

import "server-only";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { connectToDatabase } from "@/lib/db";
import { CriteriaModel } from "@/models";
import { requireSession } from "@/lib/auth";
import type { ActionResult, Criteria } from "@/types";

const criteriaSchema = z.object({
  trackerId: z.string().min(1),
  title: z.string().min(1, "Title is required"),
  subtitle: z.string().optional(),
  maxScore: z.coerce.number().min(1, "Max score must be at least 1"),
  sortOrder: z.coerce.number().optional(),
});

export type CriteriaFormInput = z.infer<typeof criteriaSchema>;

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

function toCriteria(doc: Record<string, unknown>): Criteria {
  return {
    id: serializeId(doc._id),
    trackerId: serializeId(doc.trackerId),
    title: String(doc.title ?? ""),
    subtitle: String(doc.subtitle ?? ""),
    maxScore: Number(doc.maxScore ?? 0),
    sortOrder: Number(doc.sortOrder ?? 0),
    createdAt: serializeDate(doc.createdAt),
    updatedAt: serializeDate(doc.updatedAt),
  };
}

export async function getCriteriaByTracker(trackerId: string): Promise<Criteria[]> {
  await requireSession();
  await connectToDatabase();
  const docs = await CriteriaModel.find({ trackerId }).sort({ sortOrder: 1 }).lean();
  return docs.map((d) => toCriteria(d as unknown as Record<string, unknown>));
}

export async function createCriteria(
  _prev: ActionResult<Criteria> | null,
  formData: FormData,
): Promise<ActionResult<Criteria>> {
  await requireSession();
  const parsed = criteriaSchema.safeParse(Object.fromEntries(formData));
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
    const maxOrder = await CriteriaModel.findOne({ trackerId: data.trackerId })
      .sort({ sortOrder: -1 })
      .select("sortOrder")
      .lean();
    const sortOrder = data.sortOrder ?? (maxOrder ? (maxOrder as unknown as Record<string, unknown>).sortOrder as number + 1 : 0);

    const doc = await CriteriaModel.create({
      trackerId: data.trackerId,
      title: data.title,
      subtitle: data.subtitle || "",
      maxScore: data.maxScore,
      sortOrder,
    });

    revalidatePath(`/trackers/${data.trackerId}`);
    return {
      success: true,
      data: toCriteria(doc.toObject()),
      message: "Criteria added successfully.",
    };
  } catch (error) {
    console.error("[createCriteria]", error);
    return { success: false, error: "Failed to create criteria." };
  }
}

export async function updateCriteria(
  id: string,
  _prev: ActionResult<Criteria> | null,
  formData: FormData,
): Promise<ActionResult<Criteria>> {
  await requireSession();
  const parsed = criteriaSchema.safeParse(Object.fromEntries(formData));
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
    const doc = await CriteriaModel.findByIdAndUpdate(
      id,
      {
        title: data.title,
        subtitle: data.subtitle || "",
        maxScore: data.maxScore,
        sortOrder: data.sortOrder ?? 0,
      },
      { new: true },
    );
    if (!doc) return { success: false, error: "Criteria not found." };

    revalidatePath(`/trackers/${data.trackerId}`);
    return {
      success: true,
      data: toCriteria(doc.toObject()),
      message: "Criteria updated successfully.",
    };
  } catch (error) {
    console.error("[updateCriteria]", error);
    return { success: false, error: "Failed to update criteria." };
  }
}

export async function deleteCriteria(id: string, trackerId: string): Promise<ActionResult> {
  await requireSession();
  try {
    await connectToDatabase();
    await CriteriaModel.findByIdAndDelete(id);
    revalidatePath(`/trackers/${trackerId}`);
    return { success: true, message: "Criteria deleted successfully." };
  } catch (error) {
    console.error("[deleteCriteria]", error);
    return { success: false, error: "Failed to delete criteria." };
  }
}

export async function reorderCriteria(
  items: { id: string; sortOrder: number }[],
): Promise<ActionResult> {
  await requireSession();
  try {
    await connectToDatabase();
    const ops = items.map((item) => ({
      updateOne: {
        filter: { _id: item.id },
        update: { $set: { sortOrder: item.sortOrder } },
      },
    }));
    await CriteriaModel.bulkWrite(ops);
    return { success: true, message: "Reordered successfully." };
  } catch (error) {
    console.error("[reorderCriteria]", error);
    return { success: false, error: "Failed to reorder criteria." };
  }
}