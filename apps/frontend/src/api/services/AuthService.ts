import { api } from "../axios";
import { authEndpoints } from "../endpoints";
import type {
  ForgotPasswordResponse,
  RegisterRequest,
  ResetPasswordRequest,
  ResetPasswordResponse,
  SetupMfaResponse,
  SigninResponse,
  SignupResponse,
  VerifyEmailResponse,
  VerifyMfaResponse,
} from "../../types/auth";

export async function registerUser(data: RegisterRequest) {
  const response = await api.post<SignupResponse>(authEndpoints.SIGN_UP, data);
  return response.data;
}

export async function verifyUser(token: string) {
  const response = await api.post<VerifyEmailResponse>(authEndpoints.VERIFY, {
    token,
  });
  return response.data;
}

export async function setupMfa(data: { email: string; otp: string }) {
  const response = await api.post<SetupMfaResponse>(authEndpoints.SETUP_MFA, data);
  return response.data;
}

export async function loginUser(data: { email: string; password: string }) {
  const response = await api.post<SigninResponse>(authEndpoints.SIGN_IN, data);
  return response.data;
}

export async function verifyMfa(data: { email: string; otp: string }) {
  const response = await api.post<VerifyMfaResponse>(
    authEndpoints.VERIFY_MFA,
    data,
  );
  return response.data;
}

export async function forgotPassword(data: { email: string }) {
  const response = await api.post<ForgotPasswordResponse>(
    authEndpoints.FORGOT_PASSWORD,
    data,
  );
  return response.data;
}

export async function resetPassword(data: ResetPasswordRequest) {
  const response = await api.post<ResetPasswordResponse>(
    authEndpoints.RESET_PASSWORD,
    data,
  );
  return response.data;
}
