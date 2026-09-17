"use client";

export async function celebrateTaskCompletion(): Promise<void> {
  if (
    typeof window === "undefined" ||
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  ) {
    return;
  }

  try {
    const { default: confetti } = await import("canvas-confetti");
    confetti({
      particleCount: 48,
      spread: 58,
      startVelocity: 28,
      origin: { y: 0.72 },
    });
  } catch {
    // A visual enhancement must never interrupt successful task completion.
  }
}
