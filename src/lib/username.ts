export const USERNAME_MIN_LENGTH = 3;
export const USERNAME_MAX_LENGTH = 32;
export const USERNAME_PATTERN = /^[a-z0-9](?:[a-z0-9_]{1,30}[a-z0-9])$/;
const INTERNAL_AUTH_DOMAIN = 'users.ktg.invalid';

export function normalizeUsername(value: string): string {
  return value.trim().toLowerCase();
}

export function validateUsername(value: string): string | null {
  const username = normalizeUsername(value);
  if (username.length < USERNAME_MIN_LENGTH || username.length > USERNAME_MAX_LENGTH) {
    return `Username harus ${USERNAME_MIN_LENGTH}–${USERNAME_MAX_LENGTH} karakter.`;
  }
  if (!USERNAME_PATTERN.test(username)) {
    return 'Gunakan huruf kecil, angka, atau underscore; awal dan akhir harus huruf/angka.';
  }
  return null;
}

export function usernameToInternalEmail(value: string): string {
  const username = normalizeUsername(value);
  const validationError = validateUsername(username);
  if (validationError) throw new Error(validationError);
  return `${username}@${INTERNAL_AUTH_DOMAIN}`;
}
