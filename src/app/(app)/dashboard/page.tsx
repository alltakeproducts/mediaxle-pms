import { requireSession } from "@/lib/auth";
import { getDashboardStats, getRecentAssessments } from "@/actions/assessments";
import { getTrackers } from "@/actions/trackers";
import { DashboardContent } from "./dashboard-content";

export default async function DashboardPage() {
  const session = await requireSession();
  const [stats, recentAssessments, trackers] = await Promise.all([
    getDashboardStats(),
    getRecentAssessments(5),
    getTrackers(),
  ]);

  return (
    <DashboardContent
      session={session}
      stats={stats}
      recentAssessments={recentAssessments}
      trackers={trackers}
    />
  );
}