import { api } from "../axios";
import { profileEndpoints } from "../endpoints";
import type {
  Profile,
  ProfileAddress,
  UpdateAddressPayload,
  UpdateProfilePayload,
  UpdateProfileResponse,
} from "../../types/profile";

export async function getProfile(): Promise<Profile> {
  const res = await api.get<{ success: boolean; data: Profile }>(
    profileEndpoints.DETAIL,
  );
  return res.data.data;
}

export async function updateProfile(
  payload: UpdateProfilePayload,
  avatar?: File,
): Promise<UpdateProfileResponse> {
  if (avatar) {
    const form = new FormData();
    form.append("avatar", avatar);
    for (const [key, value] of Object.entries(payload)) {
      if (value !== undefined && value !== null) {
        form.append(key, value);
      }
    }

    const res = await api.patch<{
      success: boolean;
      data: UpdateProfileResponse;
    }>(profileEndpoints.DETAIL, form, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return res.data.data;
  }

  const res = await api.patch<{
    success: boolean;
    data: UpdateProfileResponse;
  }>(profileEndpoints.DETAIL, payload);
  return res.data.data;
}

export async function updateAddress(
  payload: UpdateAddressPayload,
): Promise<ProfileAddress> {
  const res = await api.patch<{ success: boolean; data: ProfileAddress }>(
    profileEndpoints.ADDRESS,
    payload,
  );
  return res.data.data;
}