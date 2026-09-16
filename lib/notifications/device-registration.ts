import { httpsCallable } from "firebase/functions";

import { functions } from "@/lib/firebase/client";

type DeviceRegistrationInput = {
  installationId: string;
  userAgent?: string;
};

export async function registerDeviceInstallation(
  installationId: string,
): Promise<void> {
  const register = httpsCallable<DeviceRegistrationInput, void>(
    functions,
    "registerDeviceInstallation",
  );

  await register({
    installationId,
    userAgent: navigator.userAgent || undefined,
  });
}

export async function unregisterDeviceInstallation(
  installationId: string,
): Promise<void> {
  const unregister = httpsCallable<Pick<DeviceRegistrationInput, "installationId">, void>(
    functions,
    "unregisterDeviceInstallation",
  );

  await unregister({ installationId });
}
