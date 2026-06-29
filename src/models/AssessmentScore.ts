import { Schema, model, models, type Model, type InferSchemaType, Types } from "mongoose";

const AssessmentScoreSchema = new Schema(
  {
    sessionId: {
      type: Schema.Types.ObjectId,
      ref: "AssessmentSession",
      required: true,
      index: true,
    },
    traineeId: {
      type: Schema.Types.ObjectId,
      ref: "Trainee",
      required: true,
    },
    criteriaId: {
      type: Schema.Types.ObjectId,
      ref: "Criteria",
      required: true,
    },
    score: { type: Number, required: true, default: 0 },
  },
  { timestamps: true, collection: "assessmentScores" },
);

// One score per (session, trainee, criteria).
AssessmentScoreSchema.index(
  { sessionId: 1, traineeId: 1, criteriaId: 1 },
  { unique: true },
);

export type AssessmentScoreDoc = InferSchemaType<typeof AssessmentScoreSchema> & {
  sessionId: Types.ObjectId;
  traineeId: Types.ObjectId;
  criteriaId: Types.ObjectId;
};

export const AssessmentScoreModel: Model<AssessmentScoreDoc> =
  (models.AssessmentScore as Model<AssessmentScoreDoc>) ||
  model<AssessmentScoreDoc>("AssessmentScore", AssessmentScoreSchema);
