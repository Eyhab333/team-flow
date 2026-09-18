import { FieldValue } from "firebase-admin/firestore";
import { onSchedule } from "firebase-functions/v2/scheduler";

import { db } from "../firebase-admin.js";

const BATCH_WRITE_LIMIT = 500;
const RIYADH_TIME_ZONE = "Asia/Riyadh";

function getRiyadhDate(date = new Date()): string {
  const dateParts = new Intl.DateTimeFormat("en-US", {
    timeZone: RIYADH_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const part = (type: "year" | "month" | "day"): string => {
    const value = dateParts.find((datePart) => datePart.type === type)?.value;

    if (!value) {
      throw new Error(`Unable to determine Riyadh ${type}.`);
    }

    return value;
  };

  return `${part("year")}-${part("month")}-${part("day")}`;
}

export const carryOverUnfinishedTasks = onSchedule(
  {
    schedule: "5 0 * * *",
    timeZone: RIYADH_TIME_ZONE,
  },
  async () => {
    const today = getRiyadhDate();
    const overdueTasks = await db
      .collection("tasks")
      .where("active", "==", true)
      .where("status", "in", ["ACTIVE", "IN_PROGRESS"])
      .where("workDate", "<", today)
      .get();

    for (let index = 0; index < overdueTasks.docs.length; index += BATCH_WRITE_LIMIT) {
      const batch = db.batch();

      for (const task of overdueTasks.docs.slice(index, index + BATCH_WRITE_LIMIT)) {
        batch.update(task.ref, {
          workDate: today,
          updatedAt: FieldValue.serverTimestamp(),
        });
      }

      await batch.commit();
    }
  },
);
