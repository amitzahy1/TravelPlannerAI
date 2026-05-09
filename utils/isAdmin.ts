/**
 * Admin allowlist. Used to gate features (like the "What's New" popup)
 * to internal users only. The list is sourced from a hardcoded baseline
 * plus an optional comma-separated env var `VITE_ADMIN_EMAILS` so we can
 * add more admins without a code change in the future.
 */

const BASELINE_ADMIN_EMAILS = ['amitz@tailormed.co', 'amitzahy1@gmail.com'];

const envEmails = (() => {
  try {
    const raw = (import.meta as any).env?.VITE_ADMIN_EMAILS as string | undefined;
    if (!raw) return [] as string[];
    return raw.split(',').map(s => s.trim().toLowerCase()).filter(Boolean);
  } catch {
    return [];
  }
})();

const ADMIN_SET = new Set(
  [...BASELINE_ADMIN_EMAILS, ...envEmails].map(e => e.toLowerCase()),
);

export interface MinimalUser {
  email?: string | null;
}

export const isAdmin = (user: MinimalUser | null | undefined): boolean => {
  const email = (user?.email || '').toLowerCase().trim();
  if (!email) return false;
  return ADMIN_SET.has(email);
};
