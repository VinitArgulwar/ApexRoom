let rawUrl = import.meta.env.VITE_API_URL || "http://localhost:3000";

rawUrl = rawUrl.trim();
const match = rawUrl.match(/https?:\/\/[^\s]+/);
if (match) {
    rawUrl = match[0];
}

export const API_BASE_URL = rawUrl;
