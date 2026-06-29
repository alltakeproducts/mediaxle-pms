"use server";

import "server-only";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { connectToDatabase } from "@/lib/db";
import {
  AssessmentSessionModel,
  AssessmentScoreModel,
  TrackerModel,
  CriteriaModel,
  TraineeModel,
  TrackerAssignmentModel,
} from "@/models";
import { requireSession, getSession } from "@/lib/auth";
import { startOfUtcDay } from "@/lib/utils";
import type { ActionResult, AssessmentSession, AssessmentScore } from "@/types";

const scoreSchema = z.record(z.string(), z.coerce.number().min(0));

export interface SubmitAssessmentInput {
  trackerId: string;
  scores: Record<string, Record<string, number>>; // traineeId -> criteriaId -> score
  notes?: string;
}

function toSession(doc: Record<string, unknown>): AssessmentSession {
  return {
    id: String(doc._id),
    trackerId: String(doc.trackerId),
    assessmentDate: String(doc.assessmentDate),
    dayNumber: Number(doc.dayNumber),
    submittedBy: String(doc.submittedBy),
    submittedByName: String(doc.submittedByName || ""),
    pdfPath: String(doc.pdfPath || ""),
    emailStatus: (doc.emailStatus as AssessmentSession["emailStatus"]) || "pending",
    emailError: String(doc.emailError || ""),
    notes: String(doc.notes || ""),
    createdAt: String(doc.createdAt || ""),
    updatedAt: String(doc.updatedAt || ""),
  };
}

function toScore(doc: Record<string, unknown>): AssessmentScore {
  return {
    id: String(doc._id),
    sessionId: String(doc.sessionId),
    traineeId: String(doc.traineeId),
    criteriaId: String(doc.criteriaId),
    score: Number(doc.score),
  };
}

export async function getTodaysSession(trackerId: string): Promise<AssessmentSession | null> {
  await requireSession();
  await connectToDatabase();
  const today = startOfUtcDay();
  const doc = await AssessmentSessionModel.findOne({
    trackerId,
    assessmentDate: today,
  }).lean();
  return doc ? toSession(doc as unknown as Record<string, unknown>) : null;
}

export async function getScoresBySession(sessionId: string): Promise<AssessmentScore[]> {
  await requireSession();
  await connectToDatabase();
  const docs = await AssessmentScoreModel.find({ sessionId }).lean();
  return docs.map((d) => toScore(d as unknown as Record<string, unknown>));
}

export async function submitAssessment(
  data: SubmitAssessmentInput,
): Promise<ActionResult<AssessmentSession>> {
  const session = await requireSession();
  
  try {
    await connectToDatabase();
    const today = startOfUtcDay();
    
    // Check if assessment already submitted today
    let assessmentDoc = await AssessmentSessionModel.findOne({
      trackerId: data.trackerId,
      assessmentDate: today,
    });
    
    if (assessmentDoc) {
      // Update existing session notes
      assessmentDoc.notes = data.notes || "";
      assessmentDoc.submittedBy = session.id;
      assessmentDoc.submittedByName = session.name;
      await assessmentDoc.save();
      
      // Delete old scores and insert new ones
      await AssessmentScoreModel.deleteMany({ sessionId: assessmentDoc._id });
    } else {
      // Get tracker for slug (used for revalidation later)
      const tracker = await TrackerModel.findById(data.trackerId);
      if (!tracker) {
        return { success: false, error: "Tracker not found." };
      }

      // Calculate day number
      const count = await AssessmentSessionModel.countDocuments({ trackerId: data.trackerId });
      const dayNumber = count + 1;

      // Create new assessment session
      assessmentDoc = await AssessmentSessionModel.create({
        trackerId: data.trackerId,
        assessmentDate: today,
        dayNumber,
        submittedBy: session.id,
        submittedByName: session.name,
        notes: data.notes || "",
        emailStatus: "pending",
      });
    }

    // Save scores (new or updated)
    const scoreDocs: Record<string, unknown>[] = [];
    for (const [traineeId, criteriaScores] of Object.entries(data.scores)) {
      for (const [criteriaId, score] of Object.entries(criteriaScores)) {
        scoreDocs.push({
          sessionId: assessmentDoc._id,
          traineeId,
          criteriaId,
          score,
        });
      }
    }

    if (scoreDocs.length > 0) {
      await AssessmentScoreModel.insertMany(scoreDocs);
    }

    // Trigger PDF + email asynchronously (non-blocking)
    // Always regenerate PDF on update
    generateAndSendPdf(String(assessmentDoc._id)).catch((err) => {
      console.error("[async pdf/email]", err);
    });

    const tracker = await TrackerModel.findById(data.trackerId).lean();
    if (tracker) {
      revalidatePath("/assessments");
      revalidatePath("/dashboard");
      revalidatePath(`/trackers/${tracker.slug}`);
      revalidatePath("/reports");
    }

    return {
      success: true,
      data: toSession(assessmentDoc instanceof AssessmentSessionModel ? assessmentDoc.toObject() : assessmentDoc),
      message: assessmentDoc.isNew ? "Assessment submitted successfully." : "Assessment updated successfully.",
    };
  } catch (error) {
    console.error("[submitAssessment]", error);
    return { success: false, error: "Failed to submit assessment." };
  }
}

async function generateAndSendPdf(sessionId: string): Promise<void> {
  try {
    await connectToDatabase();
    const sessionDoc = await AssessmentSessionModel.findById(sessionId).lean();
    if (!sessionDoc) return;

    const scores = await AssessmentScoreModel.find({ sessionId }).lean();
    const criteria = await CriteriaModel.find({ trackerId: sessionDoc.trackerId })
      .sort({ sortOrder: 1 })
      .lean();
    const assignments = await TrackerAssignmentModel.find({
      trackerId: sessionDoc.trackerId,
    }).lean();
    const traineeIds = assignments.map((a) => a.traineeId);
    const trainees = await TraineeModel.find({ _id: { $in: traineeIds } })
      .sort({ name: 1 })
      .lean();
    const tracker = await TrackerModel.findById(sessionDoc.trackerId).lean();
    if (!tracker) return;

    // Generate PDF
    const { generateAssessmentPdf } = await import("@/services/pdf");
    const pdfPath = await generateAssessmentPdf({
      session: sessionDoc,
      scores: scores,
      criteria: criteria,
      trainees: trainees,
      tracker: tracker,
    });

    // Update session with PDF path
    await AssessmentSessionModel.findByIdAndUpdate(sessionId, { pdfPath });

    // Send email
    const { sendAssessmentEmail } = await import("@/services/email");
    const emailResult = await sendAssessmentEmail(sessionId);
    
    await AssessmentSessionModel.findByIdAndUpdate(sessionId, {
      emailStatus: emailResult.success ? "sent" : "failed",
      emailError: emailResult.success ? "" : emailResult.error,
    });
  } catch (error) {
    console.error("[generateAndSendPdf]", error);
    await AssessmentSessionModel.findByIdAndUpdate(sessionId, {
      emailStatus: "failed",
      emailError: String(error),
    });
  }
}

export async function getAssessmentHistory(trackerId: string): Promise<AssessmentSession[]> {
  await requireSession();
  await connectToDatabase();
  const docs = await AssessmentSessionModel.find({ trackerId })
    .sort({ assessmentDate: -1 })
    .lean();
  return docs.map((d) => toSession(d as unknown as Record<string, unknown>));
}

export async function getRecentAssessments(limit = 10): Promise<AssessmentSession[]> {
  await requireSession();
  await connectToDatabase();
  const docs = await AssessmentSessionModel.find()
    .sort({ createdAt: -1 })
    .limit(limit)
    .lean();
  return docs.map((d) => toSession(d as unknown as Record<string, unknown>));
}

export async function resendEmail(sessionId: string): Promise<ActionResult> {
  await requireSession();
  try {
    await connectToDatabase();
    const { sendAssessmentEmail } = await import("@/services/email");
    const result = await sendAssessmentEmail(sessionId);
    if (result.success) {
      await AssessmentSessionModel.findByIdAndUpdate(sessionId, {
        emailStatus: "sent",
        emailError: "",
      });
      return { success: true, message: "Email sent successfully." };
    } else {
      await AssessmentSessionModel.findByIdAndUpdate(sessionId, {
        emailStatus: "failed",
        emailError: result.error,
      });
      return { success: false, error: result.error || "Failed to send email." };
    }
  } catch (error) {
    console.error("[resendEmail]", error);
    return { success: false, error: "Failed to send email." };
  }
}

export async function getDashboardStats() {
  await requireSession();
  await connectToDatabase();

  const totalTrackers = await TrackerModel.countDocuments({ status: "enabled" });
  const totalTrainees = await TraineeModel.countDocuments({ status: "active" });
  
  const today = startOfUtcDay();
  const todayAssessments = await AssessmentSessionModel.countDocuments({
    assessmentDate: today,
  });

  // Daily assessments for the last 30 days
  const thirtyDaysAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
  const dailyAssessments = await AssessmentSessionModel.aggregate([
    { $match: { assessmentDate: { $gte: thirtyDaysAgo } } },
    {
      $group: {
        _id: { $dateToString: { format: "%Y-%m-%d", date: "$assessmentDate" } },
        count: { $sum: 1 },
      },
    },
    { $sort: { _id: 1 } },
  ]);

  // Monthly assessments for the last 12 months
  const twelveMonthsAgo = new Date(today.getFullYear(), today.getMonth() - 11, 1);
  const monthlyAssessments = await AssessmentSessionModel.aggregate([
    { $match: { assessmentDate: { $gte: twelveMonthsAgo } } },
    {
      $group: {
        _id: {
          year: { $year: "$assessmentDate" },
          month: { $month: "$assessmentDate" },
        },
        count: { $sum: 1 },
      },
    },
    { $sort: { "_id.year": 1, "_id.month": 1 } },
  ]);

  return {
    totalTrackers,
    totalTrainees,
    todayAssessments,
    dailyAssessments,
    monthlyAssessments,
  };
}

export async function getReports(options: {
  trackerId?: string;
  fromDate?: string;
  toDate?: string;
  page?: number;
  limit?: number;
}) {
  await requireSession();
  await connectToDatabase();

  const filter: Record<string, unknown> = {};
  if (options.trackerId) filter.trackerId = options.trackerId;
  if (options.fromDate || options.toDate) {
    filter.assessmentDate = {};
    if (options.fromDate) {
      (filter.assessmentDate as Record<string, unknown>).$gte = new Date(options.fromDate);
    }
    if (options.toDate) {
      const endDate = new Date(options.toDate);
      endDate.setHours(23, 59, 59, 999);
      (filter.assessmentDate as Record<string, unknown>).$lte = endDate;
    }
  }

  const page = options.page || 1;
  const limit = options.limit || 20;
  const skip = (page - 1) * limit;

  const [docs, total] = await Promise.all([
    AssessmentSessionModel.find(filter)
      .sort({ assessmentDate: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    AssessmentSessionModel.countDocuments(filter),
  ]);

  return {
    sessions: docs.map((d) => toSession(d as unknown as Record<string, unknown>)),
    total,
    page,
    totalPages: Math.ceil(total / limit),
  };
}

export async function getTrackerReportData(sessionId: string) {
  await requireSession();
  await connectToDatabase();

  const sessionDoc = await AssessmentSessionModel.findById(sessionId).lean();
  if (!sessionDoc) return null;

  const scores = await AssessmentScoreModel.find({ sessionId }).lean();
  const criteria = await CriteriaModel.find({ trackerId: sessionDoc.trackerId })
    .sort({ sortOrder: 1 })
    .lean();
  const assignments = await TrackerAssignmentModel.find({
    trackerId: sessionDoc.trackerId,
  }).lean();
  const traineeIds = assignments.map((a) => a.traineeId);
  const trainees = await TraineeModel.find({ _id: { $in: traineeIds } })
    .sort({ name: 1 })
    .lean();
  const tracker = await TrackerModel.findById(sessionDoc.trackerId).lean();

  if (!tracker) return null;

  return {
    session: toSession(sessionDoc as unknown as Record<string, unknown>),
    scores: scores.map((s) => toScore(s as unknown as Record<string, unknown>)),
    criteria: criteria.map((c) => ({
      id: String(c._id),
      title: c.title,
      subtitle: c.subtitle,
      maxScore: c.maxScore,
      sortOrder: c.sortOrder,
    })),
    trainees: trainees.map((t) => ({
      id: String(t._id),
      name: t.name,
      employeeId: t.employeeId,
    })),
    tracker,
  };
}