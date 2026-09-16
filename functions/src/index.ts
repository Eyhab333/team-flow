import { setGlobalOptions } from "firebase-functions/v2";

setGlobalOptions({ region: "me-central2" });

export { registerDeviceInstallation, unregisterDeviceInstallation } from "./devices.js";
export { notifyTaskCreated, notifyTaskUpdated } from "./notifications/tasks.js";
export {
  notifyRoadmapGoalCreated,
  notifyRoadmapGoalUpdated,
} from "./notifications/roadmap.js";
