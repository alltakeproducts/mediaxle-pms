import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import {
  TrackerModel,
  AssessmentSessionModel,
  TrackerAssignmentModel,
  CriteriaModel,
  AssessmentScoreModel,
  TraineeModel,
} from "@/models";
import { sendAssessmentEmail } from "@/services/email";
import { startOfUtcDay } from "@/lib/utils";

/**
 * Vercel Cron endpoint for sending daily assessment report emails.
 * Triggered daily at a scheduled time to send reports for the previous day.
 */
export async function GET(request: NextRequest) {
  try {
    // Security: Verify this is from Vercel Cron
    const cronSecret = request.headers.get("x-vercel-cron-secret");
    const expectedSecret = process.env.CRON_SECRET;

    if (!expectedSecret || cronSecret !== expectedSecret) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectToDatabase();

    // Get yesterday's date range
    const today = startOfUtcDay();
    const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);

    // Find all trackers with email recipients configured
    const trackers = await TrackerModel.find({
      emailRecipients: { $exists: true, $ne: [] },
    }).lean();

    const results = {
      processed: 0,
      emailsSent: 0,
      failed: 0,
      errors: [] as string[],
    };

    for (const tracker of trackers) {
      try {
        if (!tracker.emailRecipients || tracker.emailRecipients.length === 0) {
          continue;
        }

        // Find assessment sessions for yesterday
        const sessions = await AssessmentSessionModel.find({
          trackerId: tracker._id,
          assessmentDate: {
            $gte: yesterday,
            $lt: today,
          },
        }).sort({ dayNumber: 1 }).lean();

        if (sessions.length === 0) {
          continue; // No assessments yesterday for this tracker
        }

        // Send email for each session (or combine into one - currently one per day)
        // For simplicity, send a digest email for all sessions of the day
        // or send the most recent session
        const latestSession = sessions[sessions.length - 1];

        // Check if email already sent and successful
        if (latestSession.emailStatus === "sent") {
          results.processed++;
          continue;
        }

        // Generate PDF if needed
        const { generateAssessmentPdf } = await import("@/services/pdf");

        const criteria = await CriteriaModel.find({ trackerId: tracker._id })
          .sort({ sortOrder: 1 })
          .lean();

        const assignments = await TrackerAssignmentModel.find({
          trackerId: tracker._id,
        }).lean();

        const traineeIds = assignments.map((a) => a.traineeId);
        const trainees = await TraineeModel.find({ _id: { $in: traineeIds } })
          .sort({ name: 1 })
          .lean();

        const scores = await AssessmentScoreModel.find({
          sessionId: latestSession._id,
        }).lean();

        let pdfPath = latestSession.pdfPath;
        if (!pdfPath) {
          pdfPath = await generateAssessmentPdf({
            session: latestSession as any,
            scores: scores as any,
            criteria: criteria as any,
            trainees: trainees as any,
            tracker: tracker as any,
          });

          // Update session with PDF path
          await AssessmentSessionModel.findByIdAndUpdate(latestSession._id, {
            pdfPath,
          });
        }

        // Send email
        const emailResult = await sendAssessmentEmail(String(latestSession._id));

        // Update session email status
        await AssessmentSessionModel.findByIdAndUpdate(latestSession._id, {
          emailStatus: emailResult.success ? "sent" : "failed",
          emailError: emailResult.success ? "" : emailResult.error,
        });

        if (emailResult.success) {
          results.emailsSent++;
        } else {
          results.failed++;
          results.errors.push(
            `Tracker ${tracker.name}: ${emailResult.error}`
          );
        }

        results.processed++;
      } catch (error) {
        results.failed++;
        results.errors.push(
          `Tracker ${tracker.name}: ${error instanceof Error ? error.message : String(error)}`
        );
      }
    }

    return NextResponse.json({
      success: true,
      ...results,
      message: `Processed ${results.processed} trackers. Sent ${results.emailsSent} emails, ${results.failed} failed.`,
    });
  } catch (error) {
    console.error("[cron/daily-reports]", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}