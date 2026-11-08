/** Public address and name of the site. Override the URL per environment with NEXT_PUBLIC_SITE_URL. */
export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL ?? "https://telemetry-one.com").replace(/\/$/, "");
export const SITE_NAME = "Telemetry One";
export const X_HANDLE = "@TelemetryOne";
export const X_URL = "https://x.com/TelemetryOne";
