// Single base, exported (use either NEXT_PUBLIC_SCAN_API or NEXT_PUBLIC_API_BASE)
export const API_BASE = (
  process.env.NEXT_PUBLIC_SCAN_API ||
  process.env.NEXT_PUBLIC_API_BASE ||
  "http://localhost:5000"
).replace(/\/$/, "");

// Thin wrapper with cookies (refresh flow) – unchanged
export async function apiFetch(path: string, init: RequestInit = {}) {
  return fetch(`${API_BASE}${path}`, {
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...(init.headers || {}),
    },
    ...init,
  });
}

export async function apiFetchWithAuth(
  path: string,
  init: RequestInit = {},
  getAccessToken: () => string | null,
  onRefresh: () => Promise<string | null>
) {
  const token = getAccessToken();
  const doFetch = async (atk?: string | null) =>
    fetch(`${API_BASE}${path}`, {
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
        ...(atk ? { Authorization: `Bearer ${atk}` } : {}),
        ...(init.headers || {}),
      },
      ...init,
    });

  let res = await doFetch(token);
  if (res.status === 401) {
    const newToken = await onRefresh();
    if (newToken) res = await doFetch(newToken);
  }
  return res;
}

export type SavedWord = {
  id?: number;
  english: string;
  tamil: string;
  transliteration?: string;
  createdAt?: string;
};

export type BankResponse = {
  items: SavedWord[];     // user's "My List" (empty if not logged in)
  myListCount: number;
  defaultCount: number;   // your fixed quiz bank size (e.g., 103)
};

function authHeaders(accessToken?: string) {
  const h: Record<string, string> = {};
  if (accessToken) h.Authorization = `Bearer ${accessToken}`;
  return h;
}

/** Load the bank. Works logged-in or anonymous.
 *  Compatible with both `{items:[]}` and legacy `[]` responses.
 */
export async function getBank(accessToken?: string): Promise<BankResponse> {
  const res = await fetch(`${API_BASE}/api/bank`, {
    method: "GET",
    headers: { ...authHeaders(accessToken) },
    credentials: "include",
  });
  if (!res.ok) throw new Error(`getBank failed: ${res.status}`);
  const data = await res.json();

  if (Array.isArray(data)) {
    // legacy array -> coerce into BankResponse without guessing defaultCount
    return {
      items: data as SavedWord[],
      myListCount: data.length,
      defaultCount: 0,
    };
  }
  return data as BankResponse;
}

/** Save a word to the user's bank. Requires login. */
export async function addToBank(
  word: SavedWord,
  accessToken: string
): Promise<{ status: string; id?: number; updated?: boolean }> {
  const res = await fetch(`${API_BASE}/api/bank`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...authHeaders(accessToken),
    },
    credentials: "include",
    body: JSON.stringify(word),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || `addToBank failed: ${res.status}`);
  }
  return res.json();
}

/** Delete a saved word. Requires login. */
export async function deleteFromBank(id: number, accessToken: string) {
  const res = await fetch(`${API_BASE}/api/bank/${id}`, {
    method: "DELETE",
    headers: { ...authHeaders(accessToken) },
    credentials: "include",
  });
  if (!res.ok) throw new Error(`deleteFromBank failed: ${res.status}`);
  return res.json();
}
