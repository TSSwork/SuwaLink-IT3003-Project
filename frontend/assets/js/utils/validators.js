const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function required(value, message = "This field is required") {
  return value?.trim() ? null : message;
}

export function email(value) {
  if (!value?.trim()) return "Email is required";
  return EMAIL_PATTERN.test(value) ? null : "Email must be valid";
}

export function minLength(value, min, label = "This field") {
  if (!value?.trim()) return `${label} is required`;
  return value.length >= min ? null : `${label} must be at least ${min} characters`;
}
