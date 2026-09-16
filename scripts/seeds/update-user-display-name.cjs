const path = require("node:path");

const {
  cert,
  getApps,
  initializeApp,
} = require("firebase-admin/app");
const {
  FieldValue,
  getFirestore,
} = require("firebase-admin/firestore");

const serviceAccount = require(
  path.resolve(__dirname, "../../service-account.json"),
);

const USER = {
  uid: "RW3nCSU6wqVDbSckqBmF5ceAj052",
  email: "pres.tk@qz.org.sa",
  displayName: "عبدالرحمن سليمان الطوالة",
};

if (!getApps().length) {
  initializeApp({
    credential: cert(serviceAccount),
  });
}

const db = getFirestore();

async function main() {
  const userReference = db.collection("users").doc(USER.uid);
  const userSnapshot = await userReference.get();

  if (!userSnapshot.exists) {
    throw new Error(`Firestore user document users/${USER.uid} does not exist.`);
  }

  const storedEmail = userSnapshot.data().email;

  if (
    typeof storedEmail !== "string" ||
    storedEmail.trim().toLowerCase() !== USER.email
  ) {
    throw new Error(
      `Firestore email mismatch for users/${USER.uid}. Expected ${USER.email}.`,
    );
  }

  await userReference.update({
    displayName: USER.displayName,
    updatedAt: FieldValue.serverTimestamp(),
  });

  console.log(
    `Updated users/${USER.uid}: displayName is now "${USER.displayName}".`,
  );
}

main().catch((error) => {
  console.error("Display-name update failed:");
  console.error(error);
  process.exitCode = 1;
});
