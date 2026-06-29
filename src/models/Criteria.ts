import { Schema, model, models, type Model, type InferSchemaType, Types } from "mongoose";

const CriteriaSchema = new Schema(
  {
    trackerId: {
      type: Schema.Types.ObjectId,
      ref: "Tracker",
      required: true,
      index: true,
    },
    title: { type: String, required: true, trim: true },
    subtitle: { type: String, default: "" },
    maxScore: { type: Number, required: true, default: 5 },
    sortOrder: { type: Number, required: true, default: 0 },
  },
  { timestamps: true, collection: "criteria" },
);

CriteriaSchema.index({ trackerId: 1, sortOrder: 1 });

export type CriteriaDoc = InferSchemaType<typeof CriteriaSchema> & {
  trackerId: Types.ObjectId;
};

export const CriteriaModel: Model<CriteriaDoc> =
  (models.Criteria as Model<CriteriaDoc>) ||
  model<CriteriaDoc>("Criteria", CriteriaSchema);
