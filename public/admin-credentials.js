// Public credential rules shared with the server. No account data belongs here.
export const USERNAME_PATTERN = '[A-Za-z0-9_-]{3,32}';
export const PASSWORD_HINT = '12+ characters with uppercase, lowercase, a number and a symbol.';
export function normalizeUsername(value) {
  if (typeof value !== 'string' || !/^[A-Za-z0-9_-]{3,32}$/.test(value.trim()))
    throw Error('Use 3–32 letters, numbers, underscores or hyphens for your username.');
  return value.trim().toLowerCase();
}
export function passwordChecks(value) {
  const password=typeof value==='string'?value:'';
  return [
    {label:'12+ characters',met:password.length>=12&&password.length<=256},
    {label:'uppercase',met:/[A-Z]/.test(password)},
    {label:'lowercase',met:/[a-z]/.test(password)},
    {label:'a number',met:/[0-9]/.test(password)},
    {label:'a symbol',met:/[^A-Za-z0-9\s]/.test(password)},
  ];
}
export function passwordError(value) {
  return passwordChecks(value).every(check=>check.met)?'':PASSWORD_HINT;
}
