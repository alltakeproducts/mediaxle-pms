import { getTrackers } from "@/actions/trackers";
import { AssessmentsClient } from "./assessments-client";

export default async function AssessmentsPage() {
  const trackers = await getTrackers();
  return <AssessmentsClient trackers={trackers} />;
}