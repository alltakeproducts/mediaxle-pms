import { getTracker } from "@/actions/trackers";
import { getCriteriaByTracker } from "@/actions/criteria";
import { getTraineesByTracker, getUnassignedTrainees } from "@/actions/trainees";
import { getTodaysSession } from "@/actions/assessments";
import { notFound } from "next/navigation";
import { TrackerDetailClient } from "./tracker-detail-client";

export default async function TrackerDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const tracker = await getTracker(slug);
  if (!tracker) notFound();

  const [criteria, trainees, unassignedTrainees, todaysSession] = await Promise.all([
    getCriteriaByTracker(tracker.id),
    getTraineesByTracker(tracker.id),
    getUnassignedTrainees(tracker.id),
    getTodaysSession(tracker.id),
  ]);

  return (
    <TrackerDetailClient
      tracker={tracker}
      criteria={criteria}
      trainees={trainees}
      unassignedTrainees={unassignedTrainees}
      todaysSession={todaysSession}
    />
  );
}