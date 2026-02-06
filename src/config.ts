export const TUDUDI_URL = process.env.TUDUDI_URL || "http://localhost:3002";
export const TUDUDI_API_TOKEN = process.env.TUDUDI_API_TOKEN;
export const API_VERSION = process.env.TUDUDI_API_VERSION || "v1";
export const API_BASE = `${TUDUDI_URL}/api/${API_VERSION}`;

export const PRIORITY_MAP: Record<number, string> = {
  0: "low",
  1: "medium",
  2: "high",
};

export const STATUS_MAP: Record<number, string> = {
  0: "pending",
  1: "in_progress",
  2: "completed",
  3: "archived",
};
