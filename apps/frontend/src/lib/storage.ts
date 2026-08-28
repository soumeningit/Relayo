import { EncryptStorage } from "encrypt-storage";

const SECRET_KEY =
  import.meta.env.VITE_ENCRYPT_STORAGE_KEY ||
  "relayo_encrypt_storage_key_fallback_987654321";

export const encryptStorage = EncryptStorage.create(SECRET_KEY, {
  prefix: "relayo",
  engine: "noble",
});
