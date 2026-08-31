import { AxiosError } from "axios";

interface ApiErrorBody {
  message?: string;
  error?: string;
  code?: string;
}

export function getApiErrorCode(error: unknown): string | null {
  if (error instanceof AxiosError) {
    const body = error.response?.data as ApiErrorBody | string | undefined;
    if (body && typeof body === "object" && typeof body.code === "string") {
      return body.code;
    }
  }
  return null;
}

export function isMfaRequired(error: unknown): boolean {
  return getApiErrorCode(error) === "MFA_REQUIRED";
}

export function getApiErrorMessage(error: unknown): string {
  if (error instanceof AxiosError) {
    const body = error.response?.data as ApiErrorBody | string | undefined;

    if (typeof body === "string" && body.trim()) return body;
    if (body && typeof body === "object") {
      const message = body.message ?? body.error;
      if (message) return message;
    }

    if (error.code === "ERR_NETWORK") {
      return "Cannot reach the server. Please check your connection.";
    }
    return error.message || "Something went wrong";
  }

  if (error instanceof Error && error.message) return error.message;
  return "Something went wrong";
}
