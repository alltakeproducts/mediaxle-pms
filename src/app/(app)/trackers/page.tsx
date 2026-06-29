import { getTrackers } from "@/actions/trackers";
import { TrackersClient } from "./trackers-client";

export default async function TrackersPage() {
  const trackers = await getTrackers();
  return <TrackersClient trackers={trackers} />;
}