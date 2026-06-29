"use server";

import "server-only";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { connectToDatabase } from "@/lib/db";
import { SettingsModel } from "@/models";
import { requireSession } from "@/lib/auth";
import { parseEmailList } from "@/lib/utils";
import type { ActionResult, AppSettings } from "@/types";

const settingsSchema = z.object({
  companyName: z.string().optional(),
  companyLogo: z.string().optional(),
  applicationName: z.string().optional(),
  defaultSenderEmail: z.string().optional(),
  defaultCc: z.string().optional(),
  defaultBcc: z.string().optional(),
});

export type SettingsFormInput = z.infer<typeof settingsSchema>;

function toSettings(doc: Record<string, unknown>): AppSettings {
  return {
    id: String(doc._id),
    companyName: String(doc.companyName || "Your Company"),
    companyLogo: String(doc.companyLogo || ""),
    applicationName: String(doc.applicationName || "Performance Tracker"),
    defaultSenderEmail: String(doc.defaultSenderEmail || ""),
    defaultCc: Array.isArray(doc.defaultCc) ? doc.defaultCc.map(String) : [],
    defaultBcc: Array.isArray(doc.defaultBcc) ? doc.defaultBcc.map(String) : [],
    updatedAt: String(doc.updatedAt || ""),
  };
}

export async function getSettings(): Promise<AppSettings | null> {
  await requireSession();
  await connectToDatabase();
  const doc = await SettingsModel.findOne().lean();
  return doc ? toSettings(doc as unknown as Record<string, unknown>) : null;
}

export async function updateSettings(
  _prev: ActionResult<AppSettings> | null,
  formData: FormData,
): Promise<ActionResult<AppSettings>> {
  await requireSession();
  const parsed = settingsSchema.safeParse(Object.fromEntries(formData));
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

    // Upsert settings
    const doc = await SettingsModel.findOneAndUpdate(
      {},
      {
        $set: {
          companyName: data.companyName || "Your Company",
          companyLogo: data.companyLogo || "",
          applicationName: data.applicationName || "Performance Tracker",
          defaultSenderEmail: data.defaultSenderEmail || "",
          defaultCc: parseEmailList(data.defaultCc),
          defaultBcc: parseEmailList(data.defaultBcc),
        },
      },
      { upsert: true, new: true },
    );

    revalidatePath("/settings");
    return {
      success: true,
      data: toSettings(doc.toObject()),
      message: "Settings saved successfully.",
    };
  } catch (error) {
    console.error("[updateSettings]", error);
    return { success: false, error: "Failed to save settings." };
  }
}