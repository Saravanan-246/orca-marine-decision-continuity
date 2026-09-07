import axios from "axios";

export const orcaClient = axios.create({
  baseURL:
    import.meta.env.VITE_ORCA_API_URL ||
    (import.meta.env.PROD
      ? "https://orca-marine-decision-continuity.onrender.com"
      : ""),
  headers: {
    "Content-Type": "application/json",
  },
  timeout: 20000,
});

export function readApiError(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const data = error.response?.data as
      | { detail?: unknown }
      | undefined;
    const detail = data?.detail;

    if (typeof detail === "string" && detail.trim()) {
      return detail;
    }

    if (
      detail &&
      typeof detail === "object" &&
      "message" in detail &&
      typeof detail.message === "string"
    ) {
      return detail.message;
    }

    if (Array.isArray(detail)) {
      const first = detail[0] as { msg?: unknown } | undefined;
      if (first?.msg) {
        return String(first.msg);
      }
    }

    if (error.response?.status === 404) {
      return "The requested resource was not found.";
    }

    if (error.response?.status === 405) {
      return "This action is not allowed on the server.";
    }

    if (error.response?.status === 422) {
      return "The server rejected this request.";
    }

    if (error.response?.status === 502 || error.response?.status === 503) {
      return "The ORCA service is temporarily unavailable. Try again in a moment.";
    }

    if (error.code === "ECONNABORTED") {
      return "The request timed out. Check your connection and try again.";
    }

    if (error.message === "Network Error") {
      return "Could not reach the ORCA service. Check your connection and try again.";
    }

    if (error.message) {
      return error.message;
    }
  }

  if (error instanceof Error) {
    return error.message;
  }

  return "Request failed.";
}

export function isNotFoundError(error: unknown): boolean {
  return axios.isAxiosError(error) && error.response?.status === 404;
}
