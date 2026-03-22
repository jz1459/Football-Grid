/**
 * Base URL for the Football Grid API (`backend` Express). Reads `NEXT_PUBLIC_API_URL`
 * (set at build time for Docker); strips a trailing slash.
 */
export function getApiBase(): string {
  const raw = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5001";
  return raw.replace(/\/$/, "");
}
