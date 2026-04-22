export { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";

// Server handles the full OAuth dance; the client just points at the start route.
export const getLoginUrl = () => {
  const returnTo = `${window.location.pathname}${window.location.search}`;
  const params = new URLSearchParams({ returnTo: returnTo || "/" });
  return `/api/auth/google?${params.toString()}`;
};
