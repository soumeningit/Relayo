export interface ProfileUserInfo {
  id: string;
  userId: string;
  email: string;
  name: string;
  status: string;
  role: string;
  createdAt: string;
  updatedAt: string;
}

export interface UserProfile {
  id: string;
  userId: string;
  bio: string | null;
  avatarUrl: string | null;
  updatedAt: string;
}

export type ProfileAddressType = "CURRENT" | "PERMANENT";

export interface ProfileAddress {
  id: string;
  addressId: string;
  type: ProfileAddressType;
  street: string | null;
  city: string | null;
  state: string;
  country: string;
  zipCode: string;
  updatedAt: string;
}

export interface Profile {
  user: ProfileUserInfo;
  userProfile: UserProfile;
  addresses: ProfileAddress[];
}

export interface UpdateProfilePayload {
  name?: string;
  bio?: string;
  avatarUrl?: string;
}

export interface UpdateProfileResponse {
  user: ProfileUserInfo;
  userProfile: UserProfile;
}

export interface UpdateAddressPayload {
  type: ProfileAddressType;
  street?: string;
  city?: string;
  state?: string;
  country?: string;
  zipCode?: string;
}