import { z } from "zod";

export const signupSchema = z.object({
  body: z
    .object({
      name: z
        .string({ error: "Name is required" })
        .trim()
        .min(1, { error: "Name cannot be empty" })
        .max(255, { error: "Name is too long" }),

      email: z
        .email({ error: "Email is required" })
        .max(255, { error: "Email is too long" }),

      password: z
        .string({ error: "Password is required" })
        .trim()
        .min(6, { error: "Password must be at least 6 characters" }),

      confirmPassword: z
        .string({ error: "Confirm password is required" })
        .trim()
        .min(6, {
          error: "Confirm password must be at least 6 characters",
        }),
    })
    .refine((data) => data.password === data.confirmPassword, {
      error: "Passwords do not match",
      path: ["confirmPassword"],
    }),
});

export const signinSchema = z.object({
  body: z.object({
    email: z.email({ error: "Email is required" }),

    password: z
      .string({ error: "Password is required" })
      .trim()
      .min(1, { error: "Password is required" }),
  }),
});

export const verifySchema = z.object({
  body: z.object({
    token: z.string({ error: "Verification token is required" }).trim().min(1, {
      error: "Verification token cannot be empty",
    }),
  }),

  query: z.object({
    invitationToken: z.string().optional(),
  }),
});

export const setupMfaSchema = z.object({
  body: z.object({
    email: z.email({ error: "Email is required" }),

    otp: z.string({ error: "OTP is required" }).length(6, {
      error: "OTP must be exactly 6 characters",
    }),
  }),
});

export const verifyMfaSchema = z.object({
  body: z.object({
    email: z.email({ error: "Email is required" }),

    otp: z.string({ error: "OTP is required" }).length(6, {
      error: "OTP must be exactly 6 characters",
    }),
  }),
});

export const forgotPasswordSchema = z.object({
  body: z.object({
    email: z.email({ error: "Email is required" }),
  }),
});

export const resetPasswordSchema = z.object({
  body: z
    .object({
      token: z.string({ error: "Reset token is required" }).trim().min(1, {
        error: "Reset token cannot be empty",
      }),

      mfaOtp: z
        .string({ error: "MFA OTP is required" })
        .length(6, {
          error: "MFA OTP must be exactly 6 characters",
        })
        .optional(),

      password: z.string({ error: "New password is required" }).trim().min(6, {
        error: "Password must be at least 6 characters",
      }),

      confirmPassword: z
        .string({ error: "Confirm password is required" })
        .trim()
        .min(6, {
          error: "Confirm password must be at least 6 characters",
        }),
    })
    .refine((data) => data.password === data.confirmPassword, {
      error: "Passwords do not match",
      path: ["confirmPassword"],
    }),
});
