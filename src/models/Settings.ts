import { Schema, model, models, type Model, type InferSchemaType } from "mongoose";

/**
 * Application-wide settings. A single document is expected (singleton);
 * SMTP credentials are intentionally NOT stored here — they live only in env.
 */
const SettingsSchema = new Schema(
  {
    companyName: { type: String, default: "Your Company" },
    companyLogo: { type: String, default: "" },
    applicationName: { type: String, default: "Performance Tracker" },
    defaultSenderEmail: { type: String, default: "" },
    defaultCc: { type: [String], default: [] },
    defaultBcc: { type: [String], default: [] },
  },
  { timestamps: true, collection: "settings" },
);

export type SettingsDoc = InferSchemaType<typeof SettingsSchema>;

export const SettingsModel: Model<SettingsDoc> =
  (models.Settings as Model<SettingsDoc>) ||
  model<SettingsDoc>("Settings", SettingsSchema);
