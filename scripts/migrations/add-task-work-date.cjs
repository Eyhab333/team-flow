const path = require("node:path");

const { cert, getApps, initializeApp } = require("firebase-admin/app");
const { getFirestore } = require("firebase-admin/firestore");

const APPLY = process.env.APPLY_TASK_WORK_DATE_MIGRATION === "1";
const BATCH_WRITE_LIMIT = 500;
const SAMPLE_LIMIT = 10;
const serviceAccount = require(
  path.resolve(__dirname, "../../service-account.json"),
);

if (!getApps().length) {
  initializeApp({ credential: cert(serviceAccount) });
}

const db = getFirestore();

function isValidDateOnly(value) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }

  const [year, month, day] = value.split("-").map(Number);
  const candidate = new Date(Date.UTC(year, month - 1, day));

  return year >= 1
    && candidate.getUTCFullYear() === year
    && candidate.getUTCMonth() === month - 1
    && candidate.getUTCDate() === day;
}

function chunk(values, size) {
  const result = [];

  for (let index = 0; index < values.length; index += size) {
    result.push(values.slice(index, index + size));
  }

  return result;
}

async function main() {
  const taskSnapshot = await db.collection("tasks").get();
  const plannedUpdates = [];
  const conflicts = [];
  let alreadyContainingWorkDate = 0;

  for (const task of taskSnapshot.docs) {
    const data = task.data();
    const workDate = data.workDate;
    const hasWorkDate = typeof workDate === "string" && workDate.trim();
    const hasValidOriginalDate = isValidDateOnly(data.originalDate);

    if (!hasValidOriginalDate) {
      conflicts.push({
        id: task.id,
        originalDate: data.originalDate ?? null,
      });
    }

    if (hasWorkDate) {
      alreadyContainingWorkDate += 1;
      continue;
    }

    if (!hasValidOriginalDate) {
      continue;
    }

    plannedUpdates.push({
      reference: task.ref,
      id: task.id,
      workDate: data.originalDate,
    });
  }

  console.log(
    JSON.stringify(
      {
        mode: APPLY ? "apply" : "preview",
        scanned: taskSnapshot.size,
        alreadyContainingWorkDate,
        needsMigration: plannedUpdates.length,
        missingOrInvalidOriginalDate: conflicts.length,
        samplePlannedChanges: plannedUpdates.slice(0, SAMPLE_LIMIT).map((task) => ({
          id: task.id,
          workDate: task.workDate,
        })),
        sampleConflicts: conflicts.slice(0, SAMPLE_LIMIT),
      },
      null,
      2,
    ),
  );

  if (!APPLY) {
    console.log("Preview only. No task documents were changed.");
    return;
  }

  for (const taskChunk of chunk(plannedUpdates, BATCH_WRITE_LIMIT)) {
    const batch = db.batch();

    for (const task of taskChunk) {
      batch.update(task.reference, { workDate: task.workDate });
    }

    await batch.commit();
  }

  console.log(`Applied workDate to ${plannedUpdates.length} task document(s).`);

  if (conflicts.length > 0) {
    console.error(
      "Some task documents were skipped because originalDate is missing or invalid.",
    );
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error("Task workDate migration failed:");
  console.error(error);
  process.exitCode = 1;
});
