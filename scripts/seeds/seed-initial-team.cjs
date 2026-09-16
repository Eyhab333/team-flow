const path = require("node:path");

const {
  cert,
  getApps,
  initializeApp,
} = require("firebase-admin/app");

const {
  getAuth,
} = require("firebase-admin/auth");

const {
  FieldValue,
  getFirestore,
} = require("firebase-admin/firestore");

const serviceAccount = require(
  path.resolve(__dirname, "../../service-account.json")
);

if (!getApps().length) {
  initializeApp({
    credential: cert(serviceAccount),
  });
}

const auth = getAuth();
const db = getFirestore();

const TEAM = {
  id: "executive-management-takween",
  name: "الإدارة التنفيذية - تكوين",
  description: "",
};

const USERS = [
  {
    uid: "RW3nCSU6wqVDbSckqBmF5ceAj052",
    email: "pres.tk@qz.org.sa",
    teamRole: "LEADER",
    order: 1,
  },
  {
    uid: "4gTPSiy9EUZedVAOmzch3wxM8Vu2",
    email: "e.ahmad@qz.org.sa",
    teamRole: "MEMBER",
    order: 2,
  },
];

function membershipId(teamId, uid) {
  return `${teamId}__${uid}`;
}

async function main() {
  console.log("========================================");
  console.log("TEAM FLOW - INITIAL TEAM SEED");
  console.log("========================================");
  console.log(`Team: ${TEAM.name}`);
  console.log("");

  const authUsers = [];

  for (const item of USERS) {
    const authUser = await auth.getUser(item.uid);

    if (
      authUser.email?.toLowerCase() !==
      item.email.toLowerCase()
    ) {
      throw new Error(
        `UID/email mismatch for ${item.email}. Firebase Auth returned: ${
          authUser.email || "NO_EMAIL"
        }`
      );
    }

    authUsers.push({
      ...item,
      authUser,
    });
  }

  const batch = db.batch();

  const teamRef = db.collection("teams").doc(TEAM.id);

  batch.set(
    teamRef,
    {
      id: TEAM.id,
      name: TEAM.name,
      description: TEAM.description,
      active: true,

      createdBy: USERS[0].uid,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    },
    {
      merge: true,
    }
  );

  for (const item of authUsers) {
    const {
      uid,
      email,
      teamRole,
      order,
      authUser,
    } = item;

    const userRef = db.collection("users").doc(uid);

    const fallbackName = email.split("@")[0];

    batch.set(
      userRef,
      {
        uid,
        displayName:
          authUser.displayName?.trim() || fallbackName,
        email,
        photoURL: authUser.photoURL || null,
        active: !authUser.disabled,

        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      },
      {
        merge: true,
      }
    );

    const membershipRef = db
      .collection("teamMemberships")
      .doc(membershipId(TEAM.id, uid));

    batch.set(
      membershipRef,
      {
        id: membershipRef.id,

        teamId: TEAM.id,
        userId: uid,

        role: teamRole,
        active: true,
        order,

        joinedAt: FieldValue.serverTimestamp(),
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      },
      {
        merge: true,
      }
    );
  }

  await batch.commit();

  console.log("Seed completed successfully.");
  console.log("");
  console.log(`Created/updated team: ${TEAM.id}`);

  for (const item of USERS) {
    console.log(
      `${item.teamRole.padEnd(6)} | ${item.email} | ${item.uid}`
    );
  }

  console.log("");
  console.log("Collections:");
  console.log("- users");
  console.log("- teams");
  console.log("- teamMemberships");
}

main().catch((error) => {
  console.error("");
  console.error("Seed failed:");
  console.error(error);

  process.exitCode = 1;
});