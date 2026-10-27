// Public credential rules shared with the server. No account data belongs here.
export const USERNAME_PATTERN = '[A-Za-z0-9_-]{3,32}';
export const PASSWORD_HINT = '12+ characters with uppercase, lowercase, a number and a symbol.';
export function normalizeUsername(value) {
  if (typeof value !== 'string' || !/^[A-Za-z0-9_-]{3,32}$/.test(value.trim()))
    throw Error('Use 3–32 letters, numbers, underscores or hyphens for your username.');
  return value.trim().toLowerCase();
}
export function passwordError(value) {
  if (typeof value !== 'string' || value.length < 12 || value.length > 256 ||
      !/[A-Z]/.test(value) || !/[a-z]/.test(value) || !/[0-9]/.test(value) || !/[^A-Za-z0-9\s]/.test(value))
    return PASSWORD_HINT;
  return '';
}
