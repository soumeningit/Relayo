import { useCallback, useRef, useState } from "react";
import { submitPayment, verifyPayment } from "../api/services/OrgService";
import { getApiErrorMessage } from "../lib/apiError";
import type { ApiPlanId } from "../data/pricing";
import type {
  SubmitPaymentResponse,
  VerifyPaymentResponse,
} from "../types/org";

const RAZORPAY_CHECKOUT_SRC = "https://checkout.razorpay.com/v1/checkout.js";

let razorpaySdkPromise: Promise<void> | null = null;

function loadRazorpaySdk(): Promise<void> {
  if (razorpaySdkPromise) return razorpaySdkPromise;

  razorpaySdkPromise = new Promise<void>((resolve, reject) => {
    if (window.Razorpay) {
      resolve();
      return;
    }

    const existing = document.querySelector<HTMLScriptElement>(
      `script[src="${RAZORPAY_CHECKOUT_SRC}"]`,
    );
    if (existing) {
      if (existing.dataset.loaded) {
        resolve();
        return;
      }
      existing.addEventListener("load", () => resolve());
      existing.addEventListener("error", () =>
        reject(new Error("Razorpay failed to load.")),
      );
      return;
    }

    const script = document.createElement("script");
    script.src = RAZORPAY_CHECKOUT_SRC;
    script.async = true;
    script.onload = () => {
      script.dataset.loaded = "true";
      resolve();
    };
    script.onerror = () => {
      script.dataset.loaded = "false";
      reject(new Error("Razorpay failed to load."));
    };
    document.head.appendChild(script);
  });

  return razorpaySdkPromise;
}

type CheckoutStatus = "idle" | "ordering" | "opening" | "verifying";

export type CheckoutResult =
  | { kind: "free"; response: SubmitPaymentResponse }
  | { kind: "paid"; response: VerifyPaymentResponse };

/**
 * Creates a one-time Razorpay order and drives the hosted checkout modal.
 * FREE plans resolve instantly (no order is created); paid plans resolve only
 * after the payment signature is verified server-side.
 */
export function useRazorpayCheckout() {
  const [status, setStatus] = useState<CheckoutStatus>("idle");
  const busy = useRef(false);

  const createCheckout = useCallback(
    async (identifier: string, planId: ApiPlanId): Promise<CheckoutResult> => {
      if (busy.current) throw new Error("A checkout is already in progress.");
      busy.current = true;
      setStatus("ordering");

      try {
        const submit = await submitPayment(identifier, { planType: planId });

        if (!submit.data.order) {
          return { kind: "free", response: submit };
        }

        const { orderId, amount, currency, keyId } = submit.data.order;
        await loadRazorpaySdk();
        const RazorpayConstructor = window.Razorpay;

        if (!RazorpayConstructor) {
          throw new Error("Razorpay failed to load. Please refresh the page.");
        }

        setStatus("opening");

        const verified = await new Promise<VerifyPaymentResponse>(
          (resolve, reject) => {
            const rzp = new RazorpayConstructor({
              key: keyId,
              amount,
              currency,
              order_id: orderId,
              name: "Relayo",
              description: `${planId} plan · 30 days`,
              handler: async (response) => {
                setStatus("verifying");
                try {
                  const result = await verifyPayment(identifier, {
                    razorpayOrderId: response.razorpay_order_id,
                    razorpayPaymentId: response.razorpay_payment_id,
                    razorpaySignature: response.razorpay_signature,
                  });
                  if (result.data?.captured) {
                    resolve(result);
                  } else {
                    reject(
                      new Error(
                        result.message || "Payment was not completed.",
                      ),
                    );
                  }
                } catch (error) {
                  reject(new Error(getApiErrorMessage(error)));
                }
              },
              modal: {
                ondismiss: () =>
                  reject(
                    new Error(
                      "Checkout was closed before payment completed.",
                    ),
                  ),
              },
            });
            rzp.on("payment.failed", (details) => {
              reject(
                new Error(
                  details.description || details.reason || "Payment failed.",
                ),
              );
            });
            rzp.open();
          },
        );

        return { kind: "paid", response: verified };
      } catch (error) {
        if (error instanceof Error)
          throw new Error(error.message, { cause: error });
        throw new Error(getApiErrorMessage(error), { cause: error });
      } finally {
        busy.current = false;
        setStatus("idle");
      }
    },
    [],
  );

  return { createCheckout, status };
}