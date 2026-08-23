export function acceptanceModeEnabled({ locationSearch, referrer }) {
  if (new URLSearchParams(locationSearch).get("acceptance") === "1") return true;
  if (!referrer) return false;

  try {
    const parentUrl = new URL(referrer);
    const loopbackHost = parentUrl.hostname === "127.0.0.1" || parentUrl.hostname === "localhost";
    return loopbackHost && parentUrl.searchParams.get("acceptance") === "1";
  } catch {
    return false;
  }
}
