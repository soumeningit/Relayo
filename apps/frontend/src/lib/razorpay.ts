export interface RazorpayPaymentResponse {
  razorpay_payment_id: string;
  razorpay_order_id: string;
  razorpay_signature: string;
}

export interface RazorpayOptions {
  key: string;
  amount: number;
  currency: string;
  order_id: string;
  name?: string;
  description?: string;
  prefill?: { name?: string; email?: string; contact?: string };
  theme?: { color?: string };
  handler?: (response: RazorpayPaymentResponse) => void;
  modal?: { ondismiss?: () => void; confirm_close?: boolean };
}

export interface RazorpayFailureDetails {
  code?: string;
  reason?: string;
  description?: string;
  source?: string;
  step?: string;
}

export interface RazorpayInstance {
  open(): void;
  close(): void;
  on(
    event: "payment.failed",
    callback: (response: RazorpayFailureDetails) => void,
  ): void;
}

declare global {
  interface Window {
    Razorpay?: new (options: RazorpayOptions) => RazorpayInstance;
  }
}

export {};