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

export function acceptancePromptIds({ locationSearch, referrer }) {
  const direct = new URLSearchParams(locationSearch).get("acceptance_ids");
  let requested = direct;

  if (!requested && referrer) {
    try {
      const parentUrl = new URL(referrer);
      const loopbackHost = parentUrl.hostname === "127.0.0.1" || parentUrl.hostname === "localhost";
      if (loopbackHost) requested = parentUrl.searchParams.get("acceptance_ids");
    } catch {
      return [];
    }
  }

  if (!requested) return [];
  return [...new Set(
    requested
      .split(",")
      .map((value) => value.trim())
      .filter((value) => /^HBR-A\d{2}$/.test(value)),
  )].slice(0, 20);
}
