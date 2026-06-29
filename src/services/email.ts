import nodemailer from "nodemailer";
import { env } from "@/lib/env";
import { connectToDatabase } from "@/lib/db";
import {
  AssessmentSessionModel,
  AssessmentScoreModel,
  TrackerModel,
  CriteriaModel,
  TraineeModel,
  TrackerAssignmentModel,
  SettingsModel,
} from "@/models";
import type { ActionResult } from "@/types";

interface EmailResult {
  success: boolean;
  error?: string;
}

/**
 * Send assessment report email with PDF attachment via SMTP2GO.
 * Returns success/failure result.
 */
export async function sendAssessmentEmail(sessionId: string): Promise<EmailResult> {
  if (!env.smtp.isConfigured) {
    console.warn("[email] SMTP not configured, skipping email.");
    return { success: true }; // Not a failure if SMTP not set up
  }

  try {
    await connectToDatabase();
    const session = await AssessmentSessionModel.findById(sessionId).lean();
    if (!session) return { success: false, error: "Session not found." };

    const tracker = await TrackerModel.findById(session.trackerId).lean();
    if (!tracker) return { success: false, error: "Tracker not found." };

    // Get recipients from tracker, with fallback to settings defaults
    const recipients = tracker.emailRecipients || [];
    if (recipients.length === 0) {
      console.warn("[email] No recipients configured for tracker:", tracker.name);
      return { success: true }; // Not a failure, just no recipients
    }

    const settings = await SettingsModel.findOne().lean();

    // Build email HTML
    const date = session.assessmentDate
      ? new Date(session.assessmentDate).toLocaleDateString("en-GB", {
          day: "numeric",
          month: "long",
          year: "numeric",
        })
      : "";

    const html = buildEmailHtml({
      trackerName: tracker.name,
      programName: tracker.programName,
      date,
      dayNumber: session.dayNumber,
      submittedByName: session.submittedByName || "",
    });

    // Setup nodemailer transport
    const transporter = nodemailer.createTransport({
      host: env.smtp.host,
      port: env.smtp.port,
      secure: env.smtp.port === 465,
      auth: {
        user: env.smtp.username,
        pass: env.smtp.password,
      },
    });

    const mailOptions: nodemailer.SendMailOptions = {
      from: `"${env.smtp.fromName}" <${env.smtp.fromEmail}>`,
      to: recipients.join(", "),
      subject: `Assessment Report - ${tracker.name} - ${date}`,
      html,
      attachments: [],
    };

    // Attach PDF if exists
    if (session.pdfPath) {
      const fs = await import("fs/promises");
      const path = await import("path");
      const pdfFullPath = path.resolve(session.pdfPath);
      try {
        await fs.access(pdfFullPath);
        const pdfBuffer = await fs.readFile(pdfFullPath);
        mailOptions.attachments!.push({
          filename: `assessment-${date?.replace(/\//g, "-")}.pdf`,
          content: pdfBuffer,
        });
      } catch {
        console.warn("[email] PDF file not found at:", pdfFullPath);
      }
    }

    // Add CC from settings
    if (settings?.defaultCc?.length) {
      mailOptions.cc = settings.defaultCc.join(", ");
    }

    // Add BCC from settings
    if (settings?.defaultBcc?.length) {
      mailOptions.bcc = settings.defaultBcc.join(", ");
    }

    await transporter.sendMail(mailOptions);
    console.log("[email] Assessment email sent successfully to:", recipients.join(", "));
    return { success: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("[email] Failed to send:", message);
    return { success: false, error: message };
  }
}

function buildEmailHtml(data: {
  trackerName: string;
  programName: string;
  date: string;
  dayNumber: number;
  submittedByName: string;
}): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: 'Segoe UI', Arial, sans-serif; color: #1e293b; margin:0; padding:0; background:#f8fafc; }
    .container { max-width:600px; margin:0 auto; padding:20px; }
    .card { background:#ffffff; border-radius:12px; overflow:hidden; box-shadow:0 1px 3px rgba(0,0,0,0.1); }
    .header { background:#4f46e5; padding:24px; text-align:center; }
    .header h1 { margin:0; color:#ffffff; font-size:20px; }
    .header p { margin:8px 0 0; color:#c7d2fe; font-size:14px; }
    .body { padding:24px; }
    .body p { margin:8px 0; font-size:14px; line-height:1.6; color:#475569; }
    .info-row { display:flex; justify-content:space-between; padding:10px 0; border-bottom:1px solid #e2e8f0; }
    .info-row:last-child { border-bottom:none; }
    .label { font-weight:600; color:#1e293b; font-size:13px; }
    .value { color:#475569; font-size:13px; }
    .footer { padding:16px 24px; background:#f8fafc; text-align:center; font-size:12px; color:#94a3b8; }
  </style>
</head>
<body>
  <div class="container">
    <div class="card">
      <div class="header">
        <h1>${data.trackerName}</h1>
        <p>${data.programName}</p>
      </div>
      <div class="body">
        <p>Hello,</p>
        <p>A new assessment report has been submitted. Please find the details below.</p>
        <div class="info-row">
          <span class="label">Assessment Date</span>
          <span class="value">${data.date}</span>
        </div>
        <div class="info-row">
          <span class="label">Day Number</span>
          <span class="value">${data.dayNumber}</span>
        </div>
        <div class="info-row">
          <span class="label">Submitted By</span>
          <span class="value">${data.submittedByName}</span>
        </div>
        <p>The PDF report is attached to this email for your records.</p>
      </div>
      <div class="footer">
        Generated by Performance Tracker
      </div>
    </div>
  </div>
</body>
</html>`;
}