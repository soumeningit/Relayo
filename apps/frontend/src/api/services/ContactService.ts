import { api } from "../axios";

export interface ContactSubmitInput {
  name: string;
  email: string;
  message: string;
}

export async function submitContact(
  input: ContactSubmitInput,
): Promise<{ messageId: string }> {
  const res = await api.post<{ success: boolean; data: { messageId: string } }>(
    "/contact",
    input,
  );
  return res.data.data;
}
