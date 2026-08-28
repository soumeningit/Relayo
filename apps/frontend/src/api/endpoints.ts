const BASE_URL = import.meta.env.VITE_BACKEND_BASE_URL;

export const authEndpoints = {
  SIGN_UP: `${BASE_URL}/auth/signup`,
  VERIFY: `${BASE_URL}/auth/verify`,
  SETUP_MFA: `${BASE_URL}/auth/setup-mfa`,
  SIGN_IN: `${BASE_URL}/auth/signin`,
  VERIFY_MFA: `${BASE_URL}/auth/verify-mfa`,
  FORGOT_PASSWORD: `${BASE_URL}/auth/forgot-password`,
  RESET_PASSWORD: `${BASE_URL}/auth/reset-password`,
};

export const orgEndpoints = {
  CREATE: `${BASE_URL}/org`,
  MINE: `${BASE_URL}/org/mine`,
  DETAIL: (identifier: string) =>
    `${BASE_URL}/org/${encodeURIComponent(identifier)}`,
  SUBMIT_DETAILS: (identifier: string) =>
    `${BASE_URL}/org/${encodeURIComponent(identifier)}/details`,
  SUBMIT_PAYMENT: (identifier: string) =>
    `${BASE_URL}/org/${encodeURIComponent(identifier)}/payment`,
};

export const eventEndpoints = {
  ACCEPT: `${BASE_URL}/event`,
  LIST: `${BASE_URL}/events`,
  DETAIL: (identifier: string, eventId: string) =>
    `${BASE_URL}/events/${encodeURIComponent(identifier)}/details/${encodeURIComponent(eventId)}`,
  LIST_DELIVERIES: `${BASE_URL}/deliveries`,
  DETAIL_DELIVERY: (deliveryId: string) =>
    `${BASE_URL}/deliveries/${encodeURIComponent(deliveryId)}`,
};

export const deliveryEndpoints = {
  LIST: (identifier: string) =>
    `${BASE_URL}/delivery/${encodeURIComponent(identifier)}/deliveries`,
  DETAIL: (identifier: string, deliveryId: string) =>
    `${BASE_URL}/delivery/${encodeURIComponent(identifier)}/deliveries/${encodeURIComponent(deliveryId)}`,
  REPLAY: (identifier: string, deliveryId: string) =>
    `${BASE_URL}/delivery/${encodeURIComponent(identifier)}/deliveries/${encodeURIComponent(deliveryId)}/replay`,
};

export const dashboardEndpoints = {
  OVERVIEW: (identifier: string) =>
    `${BASE_URL}/dashboard/${encodeURIComponent(identifier)}/overview`,
};

export const profileEndpoints = {
  DETAIL: `${BASE_URL}/profile`,
  ADDRESS: `${BASE_URL}/profile/address`,
};
