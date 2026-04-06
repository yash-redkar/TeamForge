const DEFAULT_API_BASE_URL = "http://localhost:8000/api/v1";

const rawApiBaseUrl =
  process.env.NEXT_PUBLIC_API_URL ||
  process.env.NEXT_PUBLIC_API_BASE_URL ||
  DEFAULT_API_BASE_URL;

export const API_BASE_URL = rawApiBaseUrl.replace(/\/+$/, "");

const apiServerFromBase = API_BASE_URL.replace(/\/api\/v\d+$/i, "");

export const API_SERVER_URL = (
  process.env.NEXT_PUBLIC_SOCKET_URL ||
  process.env.NEXT_PUBLIC_API_SERVER_URL ||
  apiServerFromBase
).replace(/\/+$/, "");

export const buildApiUrl = (path: string) => {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${API_BASE_URL}${normalizedPath}`;
};
