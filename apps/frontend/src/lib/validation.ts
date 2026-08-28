const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function validateEmail(email: string): string | undefined {
  if (!email.trim()) return "Email is required";
  if (!EMAIL_PATTERN.test(email.trim())) return "Enter a valid email address";
  return undefined;
}

export function validatePassword(password: string): string | undefined {
  if (!password) return "Password is required";
  if (password.length < 6) return "Password must be at least 6 characters";
  return undefined;
}

export function validateName(name: string): string | undefined {
  if (!name.trim()) return "Name is required";
  if (name.trim().length > 255) return "Name is too long";
  return undefined;
}
