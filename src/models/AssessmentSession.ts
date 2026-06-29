import { Schema, model, models, type Model, type InferSchemaType, Types } from "mongoose";

const AssessmentSessionSchema = new Schema(
  {
    trackerId: {
      type: Schema.Types.ObjectId,
      ref: "Tracker",
      required: true,
      index: true,
    },
    // Normalised to midnight UTC so "one assessment per tracker per day" holds.
    assessmentDate: { type: Date, required: true, index: true },
    dayNumber: { type: Number, required: true, default: 1 },
    submittedBy: { type: Schema.Types.ObjectId, ref: "Admin", required: true },
    submittedByName: { type: String, default: "" },
    pdfPath: { type: String, default: "" },
    emailStatus: {
      type: String,
      enum: ["pending", "sent", "failed", "not_sent"],
      default: "pending",
    },
    emailError: { type: String, default: "" },
    notes: { type: String, default: "" },
  },
  { timestamps: true, collection: "assessmentSessions" },
);

// One session per tracker per day.
AssessmentSessionSchema.index({ trackerId: 1, assessmentDate: 1 }, { unique: true });

export type AssessmentSessionDoc = InferSchemaType<typeof AssessmentSessionSchema> & {
  trackerId: Types.ObjectId;
  submittedBy: Types.ObjectId;
};

export const AssessmentSessionModel: Model<AssessmentSessionDoc> =
  (models.AssessmentSession as Model<AssessmentSessionDoc>) ||
  model<AssessmentSessionDoc>("AssessmentSession", AssessmentSessionSchema);
