import path from "path";
import fs from "fs/promises";
import { env } from "@/lib/env";

interface PdfData {
  session: Record<string, unknown>;
  scores: Record<string, unknown>[];
  criteria: Record<string, unknown>[];
  trainees: Record<string, unknown>[];
  tracker: Record<string, unknown>;
}

/**
 * Generate a professional PDF assessment report using Puppeteer.
 * Returns the relative file path for database storage.
 */
export async function generateAssessmentPdf(data: PdfData): Promise<string> {
  const { default: puppeteer } = await import("puppeteer");

  const html = buildAssessmentHtml(data);

  const browser = await puppeteer.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  try {
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: "networkidle0" });

    const uploadsDir = path.resolve(env.uploadsDir, "pdfs");
    await fs.mkdir(uploadsDir, { recursive: true });

    const sessionId = String(data.session._id || data.session.id);
    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, "");
    const filename = `assessment-${dateStr}-${sessionId.slice(-8)}.pdf`;
    const outputPath = path.join(uploadsDir, filename);

    await page.pdf({
      path: outputPath,
      format: "A4",
      margin: { top: "20mm", bottom: "20mm", left: "15mm", right: "15mm" },
      printBackground: true,
    });

    return `uploads/pdfs/${filename}`;
  } finally {
    await browser.close();
  }
}

function buildAssessmentHtml(data: PdfData): string {
  const tracker = data.tracker as Record<string, string>;
  const session = data.session as Record<string, string>;
  const trainees = data.trainees as Record<string, string>[];
  const criteria = data.criteria as Record<string, unknown>[];
  const scores = data.scores as Record<string, unknown>[];

  const date = session.assessmentDate
    ? new Date(session.assessmentDate).toLocaleDateString("en-GB", {
        day: "numeric",
        month: "long",
        year: "numeric",
      })
    : new Date().toLocaleDateString("en-GB");

  // Build score map: traineeId -> criteriaId -> score
  const scoreMap: Record<string, Record<string, number>> = {};
  for (const s of scores) {
    const traineeId = String(s.traineeId);
    const criteriaId = String(s.criteriaId);
    if (!scoreMap[traineeId]) scoreMap[traineeId] = {};
    scoreMap[traineeId][criteriaId] = Number(s.score);
  }

  const scoreMin = Number(tracker.scoreMin ?? 0);
  const scoreMax = Number(tracker.scoreMax ?? 5);

  // Table header
  let headerCells = `<th style="padding:10px;border:1px solid #ddd;background:#4f46e5;color:white;text-align:left;position:sticky;top:0;min-width:180px;">Trainee</th>`;
  for (const c of criteria) {
    headerCells += `<th style="padding:10px;border:1px solid #ddd;background:#4f46e5;color:white;text-align:center;min-width:90px;">${c.title}</th>`;
  }
  headerCells += `<th style="padding:10px;border:1px solid #ddd;background:#4f46e5;color:white;text-align:center;min-width:70px;font-weight:bold;">Total</th>`;

  // Table rows
  let rows = "";
  const criteriaMaxTotals: number[] = [];
  const criteriaTotals: number[] = new Array(criteria.length).fill(0);
  let rowCount = 0;

  for (const trainee of trainees) {
    const traineeId = String(trainee._id || trainee.id);
    const tScores = scoreMap[traineeId] || {};
    let rowTotal = 0;
    let cells = `<td style="padding:8px 10px;border:1px solid #ddd;font-weight:500;">${trainee.name}</td>`;

    for (let i = 0; i < criteria.length; i++) {
      const c = criteria[i] as Record<string, unknown>;
      const cId = String(c._id || c.id);
      const score = tScores[cId] ?? 0;
      rowTotal += score;
      criteriaTotals[i] += score;
      cells += `<td style="padding:8px 10px;border:1px solid #ddd;text-align:center;">${score}</td>`;
    }

    cells += `<td style="padding:8px 10px;border:1px solid #ddd;text-align:center;font-weight:bold;">${rowTotal}</td>`;
    rows += `<tr style="background:${rowCount % 2 === 0 ? "#fff" : "#f8fafc"};">${cells}</tr>`;
    rowCount++;
  }

  // Average row
  let avgRow = `<td style="padding:8px 10px;border:1px solid #ddd;font-weight:600;background:#eef2ff;">Team Avg</td>`;
  let grandTotal = 0;
  for (let i = 0; i < criteria.length; i++) {
    const avg = rowCount > 0 ? (criteriaTotals[i] / rowCount).toFixed(1) : "0";
    grandTotal += criteriaTotals[i];
    avgRow += `<td style="padding:8px 10px;border:1px solid #ddd;text-align:center;font-weight:600;background:#eef2ff;">${avg}</td>`;
  }
  const grandAvg = rowCount > 0 ? (grandTotal / rowCount).toFixed(1) : "0";
  avgRow += `<td style="padding:8px 10px;border:1px solid #ddd;text-align:center;font-weight:600;background:#eef2ff;">${grandAvg}</td>`;

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Assessment Report - ${tracker.name}</title>
  <style>
    body { font-family: 'Segoe UI', Arial, sans-serif; color: #1e293b; margin:0; padding:0; }
    .header { text-align:center; margin-bottom:20px; padding-bottom:15px; border-bottom:2px solid #4f46e5; }
    .header h1 { margin:0; font-size:22px; color:#1e293b; }
    .header .program { color:#64748b; font-size:13px; margin-top:4px; }
    .header .date { color:#64748b; font-size:12px; margin-top:2px; }
    .info { display:flex; justify-content:space-between; margin-bottom:15px; font-size:12px; color:#64748b; }
    table { width:100%; border-collapse:collapse; font-size:13px; }
    th { position:sticky; top:0; }
    td, th { padding:8px 10px; border:1px solid #e2e8f0; }
    .footer { margin-top:20px; text-align:center; font-size:11px; color:#94a3b8; border-top:1px solid #e2e8f0; padding-top:10px; }
  </style>
</head>
<body>
  <div class="header">
    <h1>${tracker.name}</h1>
    <div class="program">${tracker.programName || ""}</div>
    <div class="date">Assessment Date: ${date} | Day ${session.dayNumber || "—"}</div>
  </div>
  <div class="info">
    <span>Submitted by: ${session.submittedByName || "—"}</span>
    <span>Score Range: ${scoreMin} – ${scoreMax}</span>
  </div>
  <table>
    <thead><tr>${headerCells}</tr></thead>
    <tbody>
      ${rows}
      ${avgRow}
    </tbody>
  </table>
  <div class="footer">
    Generated by Performance Tracker on ${new Date().toLocaleString("en-GB")}
  </div>
</body>
</html>`;
}