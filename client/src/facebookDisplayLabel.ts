/**
 * Maps raw `store.facebook` values (e.g. profile URL paths) to a short label for UI.
 */
const FACEBOOK_DISPLAY_BY_VALUE: Record<string, string> = {
  "profile.php?id=61566535658242": "Memor Museum",
};

export function facebookDisplayLabel(facebook: string): string {
  return FACEBOOK_DISPLAY_BY_VALUE[facebook] ?? facebook;
}
