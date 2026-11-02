export const LEGAL_VERSION = '2026-10-25';
const fields = {name:160,email:254,shipping:3000,returns:3000,retention:1500};
export function operatorProfile(value = {}) {
  return Object.fromEntries(Object.keys(fields).map(key => [key, typeof value[key] === 'string' ? value[key] : '']));
}
export function operatorConfigured(value) {
  const profile = operatorProfile(value);
  return Object.keys(fields).every(key => profile[key].trim()) && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(profile.email);
}
export function validateOperator(input) {
  const profile = operatorProfile(input);
  for (const [key, limit] of Object.entries(fields)) {
    profile[key] = profile[key].trim();
    if (['shipping','returns','retention'].includes(key) && /\[[^\]]+\]/.test(profile[key])) throw Error('Replace bracketed policy details before publishing.');
    if (!profile[key] || profile[key].length > limit) throw Error(`Provide valid operator ${key} (maximum ${limit} characters).`);
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(profile.email)) throw Error('Enter a valid public contact email.');
  if (input.acknowledged !== true) throw Error('Acknowledge the operator responsibilities before publishing.');
  return profile;
}
