import { Schema, model, models, type Model, type InferSchemaType, Types } from "mongoose";

/** Join collection: a trainee may belong to many trackers and vice-versa. */
const TrackerAssignmentSchema = new Schema(
  {
    trackerId: {
      type: Schema.Types.ObjectId,
      ref: "Tracker",
      required: true,
      index: true,
    },
    traineeId: {
      type: Schema.Types.ObjectId,
      ref: "Trainee",
      required: true,
      index: true,
    },
  },
  { timestamps: true, collection: "trackerAssignments" },
);

// A trainee can only be assigned to a given tracker once.
TrackerAssignmentSchema.index({ trackerId: 1, traineeId: 1 }, { unique: true });

export type TrackerAssignmentDoc = InferSchemaType<typeof TrackerAssignmentSchema> & {
  trackerId: Types.ObjectId;
  traineeId: Types.ObjectId;
};

export const TrackerAssignmentModel: Model<TrackerAssignmentDoc> =
  (models.TrackerAssignment as Model<TrackerAssignmentDoc>) ||
  model<TrackerAssignmentDoc>("TrackerAssignment", TrackerAssignmentSchema);
