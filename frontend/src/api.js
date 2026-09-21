import { API_BASE_URL } from "../config";

const USER_ID_KEY = "apexroom-user-id";
const TOKEN_KEY = "apexroom-auth-token";
const USER_KEY = "apexroom-user";

export const getUserId = () => {
  const savedUser = localStorage.getItem(USER_KEY);
  if (savedUser) {
    try {
      const parsed = JSON.parse(savedUser);
      if (parsed?.id) return parsed.id;
    } catch {
      // fallback
    }
  }

  let userId = localStorage.getItem(USER_ID_KEY);
  if (!userId) {
    userId = crypto.randomUUID();
    localStorage.setItem(USER_ID_KEY, userId);
  }

  return userId;
};

export const getAuthToken = () => {
  return localStorage.getItem(TOKEN_KEY);
};

export async function apiRequest(path, options = {}) {
  const token = getAuthToken();
  const headers = {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  };

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers,
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.message || "Something went wrong. Please try again.");
  }
  return data;
}

