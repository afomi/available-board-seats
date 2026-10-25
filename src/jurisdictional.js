// A minimal client for the Jurisdictional API: https://jurisdictional.org/developers
// Reads are free: 100 a day without a token, 2,000 with a free one
// (JURISDICTIONAL_TOKEN, from https://jurisdictional.org/auth/cli).

export const BASE_URL = process.env.JURISDICTIONAL_BASE_URL ?? "https://jurisdictional.org";
const TOKEN = process.env.JURISDICTIONAL_TOKEN;

// Returns the `data` of GET /api/v1/juricode: the address (when given), the
// geocoded point, and every jurisdiction containing it, each with its seats.
export async function juricode({ address, lat, lng }) {
  const params = new URLSearchParams({ include: "seats" });

  if (address) {
    params.set("address", address);
  } else if (lat != null && lng != null) {
    params.set("lat", String(lat));
    params.set("lng", String(lng));
  } else {
    throw new Error("Pass an address, or lat and lng.");
  }

  const headers = TOKEN ? { authorization: `Bearer ${TOKEN}` } : {};
  const response = await fetch(`${BASE_URL}/api/v1/juricode?${params}`, { headers });
  const body = await response.json();

  if (!response.ok) {
    throw new Error(body.error?.message ?? `Jurisdictional API answered ${response.status}`);
  }

  return body.data;
}
