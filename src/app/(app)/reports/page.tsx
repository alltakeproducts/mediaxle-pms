import { getTrackers } from "@/actions/trackers";
import { ReportsClient } from "./reports-client";

export default async function ReportsPage() {
  const trackers = await getTrackers();
  return <ReportsClient trackers={trackers} />;
}