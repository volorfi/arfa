export { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";

// Points to our own Google OAuth flow (no Manus portal needed)
export const getLoginUrl = (_returnPath?: string): string => {
  return "/api/auth/google";
};
