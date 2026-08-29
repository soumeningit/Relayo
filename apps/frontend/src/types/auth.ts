export interface RegisterRequest {
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
  /** Present when completing an invited signup — activates the pre-created account. */
  registrationToken?: string;
}

export interface SignupResponse {
  success: boolean;
  message: string;
  /** Absent for invited signups — the account is already verified. */
  verificationLink: string | null;
}

export interface VerifyEmailResponse {
  requiresMfaSetup: boolean;
  qrCode: string | null;
  email: string;
}

export interface SetupMfaResponse {
  success: boolean;
  message: string;
}

export interface SigninResponse {
  success: boolean;
  email: string;
  mfaVerificationRequired: boolean;
  accessToken: string | null;
}

export interface VerifyMfaResponse {
  success: boolean;
  message: string;
  accessToken: string;
}

export interface ForgotPasswordResponse {
  status?: number;
  success: boolean;
  enableMfa?: boolean;
  message: string;
}

export interface ResetPasswordRequest {
  token: string;
  password: string;
  confirmPassword: string;
  mfaOtp?: string;
}

export interface ResetPasswordResponse {
  status?: number;
  success: boolean;
  message: string;
}
