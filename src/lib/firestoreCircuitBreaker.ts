/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// Global Firestore Quota & Circuit Breaker Manager
// Prevents continuous write/read storms when daily free-tier quota is reached.

const QUOTA_KEY = "sym_firestore_quota_exhausted_v1";
const QUOTA_TIMESTAMP_KEY = "sym_firestore_quota_timestamp_v1";

/**
 * Checks if Google Cloud / Firestore daily quota has reset.
 * Daily quotas reset at Midnight US/Pacific (00:00:00 Pacific Time, UTC-8/UTC-7).
 */
function hasMidnightPacificPassed(recordedTimestamp: number): boolean {
  if (!recordedTimestamp) return true;
  
  const now = new Date();
  const recorded = new Date(recordedTimestamp);

  // Convert both dates to US/Pacific date strings (YYYY-MM-DD)
  const nowPacific = now.toLocaleDateString("en-US", { timeZone: "America/Los_Angeles" });
  const recordedPacific = recorded.toLocaleDateString("en-US", { timeZone: "America/Los_Angeles" });

  return nowPacific !== recordedPacific;
}

let memoryQuotaExceeded = false; // Default to false so initial fetch attempts occur

export function isFirestoreQuotaExceeded(): boolean {
  if (memoryQuotaExceeded) return true;
  if (typeof window === "undefined") return false;
  try {
    const val = sessionStorage.getItem(QUOTA_KEY);
    const ts = sessionStorage.getItem(QUOTA_TIMESTAMP_KEY);
    if (val === "true" && ts) {
      if (hasMidnightPacificPassed(Number(ts))) {
        clearFirestoreQuotaExceeded();
        return false;
      }
      return true;
    }
  } catch {}
  return memoryQuotaExceeded;
}

export function markFirestoreQuotaExceeded(): void {
  memoryQuotaExceeded = true;
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(QUOTA_KEY, "true");
    sessionStorage.setItem(QUOTA_TIMESTAMP_KEY, String(Date.now()));
  } catch {}
}

export function clearFirestoreQuotaExceeded(): void {
  memoryQuotaExceeded = false;
  if (typeof window !== "undefined") {
    try {
      sessionStorage.removeItem(QUOTA_KEY);
      sessionStorage.removeItem(QUOTA_TIMESTAMP_KEY);
    } catch {}
  }
}

export function isQuotaError(err: any): boolean {
  if (!err) return false;
  const code = err.code || "";
  const msg = err.message || String(err);
  return (
    code === "resource-exhausted" ||
    msg.includes("resource-exhausted") ||
    msg.includes("Quota limit exceeded") ||
    msg.includes("quota metric") ||
    msg.includes("Quota exceeded")
  );
}
