import { Schema, model, models, type Model, type InferSchemaType } from "mongoose";

const TraineeSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    employeeId: { type: String, required: true, unique: true, trim: true },
    email: { type: String, default: "", lowercase: true, trim: true },
    status: {
      type: String,
      enum: ["active", "inactive"],
      default: "active",
      index: true,
    },
  },
  { timestamps: true, collection: "trainees" },
);

export type TraineeDoc = InferSchemaType<typeof TraineeSchema>;

export const TraineeModel: Model<TraineeDoc> =
  (models.Trainee as Model<TraineeDoc>) ||
  model<TraineeDoc>("Trainee", TraineeSchema);
