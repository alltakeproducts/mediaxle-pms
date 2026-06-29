/**
 * Shared application types.
 *
 * These are the plain, serialisable shapes passed between server and client
 * components (Mongoose documents are mapped to these via `.toObject()` /
 * lean queries + a serializer in the data layer).
 */

export type EntityStatus = "active" | "inactive";
export type TrackerStatus = "enabled" | "disabled";
export type EmailStatus = "pending" | "sent" | "failed" | "not_sent";

/** The authenticated admin attached to a request/session. */
export interface SessionUser {
  id: string;
  name: string;
  email: string;
}

export interface Admin {
  id: string;
  name: string;
  email: string;
  status: EntityStatus;
  createdAt: string;
  updatedAt: string;
}

export interface Tracker {
  id: string;
  name: string;
  slug: string;
  programName: string;
  description?: string;
  themeColor: string;
  logo?: string;
  scoreMin: number;
  scoreMax: number;
  submissionDeadline?: string; // "HH:mm"
  emailRecipients: string[];
  status: TrackerStatus;
  createdAt: string;
  updatedAt: string;
}

export interface Criteria {
  id: string;
  trackerId: string;
  title: string;
  subtitle?: string;
  maxScore: number;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface Trainee {
  id: string;
  name: string;
  employeeId: string;
  email?: string;
  status: EntityStatus;
  createdAt: string;
  updatedAt: string;
}

export interface TrackerAssignment {
  id: string;
  trackerId: string;
  traineeId: string;
  createdAt: string;
}

export interface AssessmentSession {
  id: string;
  trackerId: string;
  assessmentDate: string;
  dayNumber: number;
  submittedBy: string;
  submittedByName?: string;
  pdfPath?: string;
  emailStatus: EmailStatus;
  emailError?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AssessmentScore {
  id: string;
  sessionId: string;
  traineeId: string;
  criteriaId: string;
  score: number;
}

export interface AppSettings {
  id: string;
  companyName: string;
  companyLogo?: string;
  applicationName: string;
  defaultSenderEmail?: string;
  defaultCc: string[];
  defaultBcc: string[];
  updatedAt: string;
}

/** Generic result shape returned by server actions to the client. */
export type ActionResult<T = void> =
  | { success: true; data: T; message?: string }
  | { success: false; error: string; fieldErrors?: Record<string, string[]> };
