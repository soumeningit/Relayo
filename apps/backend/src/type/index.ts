export type PaymentPlanType = "FREE" | "PRO" | "SCALE" | "ENTERPRISE";
export const API_KEY_PREFIX_LENGTH = 12;

export type AddressType = "CURRENT" | "PERMANENT";

export interface UpdateProfileInput {
  name?: string;
  bio?: string;
  about?: string;
  avatar?: Buffer | string;
}

export interface AddressInput {
  profileId: number;
  addressId: string;
  type: AddressType;
  street?: string;
  city?: string;
  state?: string;
  country?: string;
  zipCode?: string;
}

export type UpdateProfileType = "avatar" | "profile" | "address";
