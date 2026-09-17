import { db } from "../firebase-admin.js";

export const ACTOR_NAME_FALLBACK = "أحد أعضاء الفريق";

export async function getActorName(actorUserId: string): Promise<string> {
  const actor = await db.collection("users").doc(actorUserId).get();
  const displayName = actor.data()?.displayName;
  return typeof displayName === "string" && displayName.trim()
    ? displayName.trim()
    : ACTOR_NAME_FALLBACK;
}

export async function getNotificationRecipients(
  teamId: string,
  memberId: string,
  actorUserId: string,
): Promise<string[]> {
  const leaders = await db
    .collection("teamMemberships")
    .where("teamId", "==", teamId)
    .where("role", "==", "LEADER")
    .where("active", "==", true)
    .get();
  const recipients = new Set<string>([memberId]);
  leaders.docs.forEach((membership) => {
    const userId = membership.data().userId;
    if (typeof userId === "string") recipients.add(userId);
  });
  recipients.delete(actorUserId);
  return [...recipients];
}
