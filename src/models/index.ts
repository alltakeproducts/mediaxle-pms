/**
 * Model barrel. Importing from here guarantees every Mongoose model is
 * registered (important for populate() across files).
 */
export { AdminModel, type AdminDoc } from "./Admin";
export { TrackerModel, type TrackerDoc } from "./Tracker";
export { CriteriaModel, type CriteriaDoc } from "./Criteria";
export { TraineeModel, type TraineeDoc } from "./Trainee";
export {
  TrackerAssignmentModel,
  type TrackerAssignmentDoc,
} from "./TrackerAssignment";
export {
  AssessmentSessionModel,
  type AssessmentSessionDoc,
} from "./AssessmentSession";
export { AssessmentScoreModel, type AssessmentScoreDoc } from "./AssessmentScore";
export { SettingsModel, type SettingsDoc } from "./Settings";
