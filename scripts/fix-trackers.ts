/**
 * Fix existing trackers in DB that may have bad data from test runs.
 */
import mongoose from "mongoose";

const MONGODB_URI = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/performance_tracker";

async function fix() {
  console.log("Connecting...");
  await mongoose.connect(MONGODB_URI);
  const db = mongoose.connection.db!;

  const trackers = await db.collection("trackers").find({}).toArray();
  console.log(`Found ${trackers.length} trackers`);

  for (const t of trackers) {
    const issues: string[] = [];
    if (!t.name || t.name === "resolved_model") issues.push("bad name");
    if (!t.slug) issues.push("no slug");
    if (!t.programName) issues.push("no programName");

    if (issues.length > 0) {
      console.log(`Fixing tracker ${t._id}: ${issues.join(", ")}`);
      await db.collection("trackers").updateOne(
        { _id: t._id },
        {
          $set: {
            name: t.name === "resolved_model" ? "Sales Assessment" : t.name,
            slug: t.slug || "sales-assessment",
            programName: t.programName || "Sales Training Program",
            description: t.description || "",
            themeColor: t.themeColor || "#4f46e5",
            scoreMin: typeof t.scoreMin === "number" ? t.scoreMin : 0,
            scoreMax: typeof t.scoreMax === "number" ? t.scoreMax : 5,
            status: t.status === "disabled" ? "disabled" : "enabled",
            emailRecipients: Array.isArray(t.emailRecipients) ? t.emailRecipients : [],
            submissionDeadline: typeof t.submissionDeadline === "string" ? t.submissionDeadline : "",
            updatedAt: new Date(),
          },
        }
      );
      console.log(`  -> Fixed!`);
    } else {
      console.log(`OK: ${t.name} (${t.slug})`);
    }
  }

  await mongoose.disconnect();
  console.log("Done.");
}

fix().catch((e) => { console.error(e); process.exit(1); });