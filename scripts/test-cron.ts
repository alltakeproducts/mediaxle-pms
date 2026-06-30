/**
 * Test script for the daily reports cron job.
 * Run with: npx tsx scripts/test-cron.ts
 *
 * Prerequisites:
 * - .env.local with valid MongoDB and SMTP credentials
 * - At least one tracker with emailRecipients configured
 */

import { connectToDatabase } from "@/lib/db";
import {
  TrackerModel,
  AssessmentSessionModel,
  TrackerAssignmentModel,
  CriteriaModel,
  AssessmentScoreModel,
  TraineeModel,
} from "@/models";
import { startOfUtcDay } from "@/lib/utils";
import { sendAssessmentEmail } from "@/services/email";

async function testCron(): Promise<void> {
  console.log("🧪 Starting daily reports cron test...\n");

  try {
    // Connect to database
    await connectToDatabase();
    console.log("✅ Connected to database\n");

    // Get yesterday's date range
    const today = startOfUtcDay();
    const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);
    console.log(`📅 Testing for date range: ${yesterday.toISOString()} to ${today.toISOString()}\n`);

    // Find all trackers with email recipients configured
    const trackers = await TrackerModel.find({
      emailRecipients: { $exists: true, $ne: [] },
    }).lean();

    console.log(`🔍 Found ${trackers.length} trackers with email recipients configured\n`);

    if (trackers.length === 0) {
      console.log("⚠️  No trackers with email recipients found. Test aborted.");
      console.log("   Configure emailRecipients on at least one tracker to test.\n");
      process.exit(1);
    }

    const results = {
      processed: 0,
      emailsSent: 0,
      failed: 0,
      errors: [] as string[],
    };

    for (const tracker of trackers) {
      console.log(`\n📊 Processing tracker: ${tracker.name}`);
      console.log(`   Recipients: ${tracker.emailRecipients?.join(", ") || "none"}`);

      if (!tracker.emailRecipients || tracker.emailRecipients.length === 0) {
        console.log("   ⏭️  Skipping - no recipients");
        continue;
      }

      try {
        // Find assessment sessions for yesterday
        const sessions = await AssessmentSessionModel.find({
          trackerId: tracker._id,
          assessmentDate: {
            $gte: yesterday,
            $lt: today,
          },
        })
          .sort({ dayNumber: 1 })
          .lean();

        if (sessions.length === 0) {
          console.log("   ⏭️  No sessions for yesterday");
          continue;
        }

        console.log(`   Found ${sessions.length} session(s) for yesterday`);

        // Process each session
        for (const session of sessions) {
          console.log(`\n   📧 Processing session ${session.dayNumber} (${session.assessmentDate})`);
          console.log(`      Email status: ${session.emailStatus}`);

          if (session.emailStatus === "sent") {
            console.log("      ⏭️  Already sent, skipping");
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

          const traineeIds = assignments.map((a) => (a as any).traineeId.toString());
          const trainees = await TraineeModel.find({ _id: { $in: traineeIds } })
            .sort({ name: 1 })
            .lean();

          const scores = await AssessmentScoreModel.find({
            sessionId: session._id,
          }).lean();

          let pdfPath = session.pdfPath;
          if (!pdfPath) {
            console.log("      📄 Generating PDF...");
            pdfPath = await generateAssessmentPdf({
              session: session as any,
              scores: scores as any,
              criteria: criteria as any,
              trainees: trainees as any,
              tracker: tracker as any,
            });

            // Update session with PDF path
            await AssessmentSessionModel.findByIdAndUpdate(session._id, {
              pdfPath,
            });
            console.log(`      ✅ PDF generated: ${pdfPath}`);
          } else {
            console.log(`      📄 Using existing PDF: ${pdfPath}`);
          }

          // Check if SMTP is configured
          const smtpConfigured = process.env.SMTP_HOST && process.env.SMTP_USERNAME;

          if (!smtpConfigured) {
            console.log("      ⚠️  SMTP not configured in .env.local, skipping email send");
            results.failed++;
            results.errors.push(
              `Tracker ${tracker.name}: SMTP not configured`
            );
            continue;
          }

          // Send email
          console.log("      📨 Sending email...");
          const emailResult = await sendAssessmentEmail(String(session._id));

          // Update session email status
          await AssessmentSessionModel.findByIdAndUpdate(session._id, {
            emailStatus: emailResult.success ? "sent" : "failed",
            emailError: emailResult.success ? "" : emailResult.error,
          });

          if (emailResult.success) {
            console.log("      ✅ Email sent successfully");
            results.emailsSent++;
          } else {
            console.log(`      ❌ Email failed: ${emailResult.error}`);
            results.failed++;
            results.errors.push(
              `Tracker ${tracker.name}: ${emailResult.error}`
            );
          }

          results.processed++;
        }
      } catch (error) {
        console.log(`   ❌ Error: ${error instanceof Error ? error.message : String(error)}`);
        results.failed++;
        results.errors.push(
          `Tracker ${tracker.name}: ${error instanceof Error ? error.message : String(error)}`
        );
      }
    }

    // Print summary
    console.log("\n\n===========================================");
    console.log("📊 CRON JOB TEST SUMMARY");
    console.log("===========================================");
    console.log(`Trackers processed: ${results.processed}`);
    console.log(`Emails sent:        ${results.emailsSent}`);
    console.log(`Failed:             ${results.failed}`);

    if (results.errors.length > 0) {
      console.log("\n❌ ERRORS:");
      results.errors.forEach((err) => console.log(`   - ${err}`));
    }

    console.log("===========================================\n");

    if (results.failed > 0) {
      console.log("⚠️  Test completed with errors. Review the output above.\n");
      process.exit(1);
    } else if (results.emailsSent === 0) {
      console.log("⚠️  No emails were sent. This might be because:");
      console.log("   1. No assessments were submitted yesterday");
      console.log("   2. SMTP is not configured in .env.local");
      console.log("   3. No trackers have emailRecipients configured\n");
      process.exit(0);
    } else {
      console.log("✅ Test completed successfully!\n");
      process.exit(0);
    }
  } catch (error) {
    console.error("❌ Fatal error:", error);
    process.exit(1);
  }
}

// Run the test
testCron().catch((error) => {
  console.error("❌ Unhandled error:", error);
  process.exit(1);
});