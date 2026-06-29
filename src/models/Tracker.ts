import { Schema, model, models, type Model, type InferSchemaType } from "mongoose";

const TrackerSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
    programName: { type: String, required: true, trim: true },
    description: { type: String, default: "" },
    themeColor: { type: String, default: "#4f46e5" },
    logo: { type: String, default: "" },
    scoreMin: { type: Number, required: true, default: 0 },
    scoreMax: { type: Number, required: true, default: 5 },
    // Stored as "HH:mm"; optional.
    submissionDeadline: { type: String, default: "" },
    emailRecipients: { type: [String], default: [] },
    status: {
      type: String,
      enum: ["enabled", "disabled"],
      default: "enabled",
      index: true,
    },
  },
  { timestamps: true, collection: "trackers" },
);

export type TrackerDoc = InferSchemaType<typeof TrackerSchema>;

export const TrackerModel: Model<TrackerDoc> =
  (models.Tracker as Model<TrackerDoc>) ||
  model<TrackerDoc>("Tracker", TrackerSchema);
