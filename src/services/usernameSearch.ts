export interface SiteResult {
  name: string;
  category: string;
  url: string;
  status: "found" | "not_found" | "error";
  httpStatus?: number;
}

export interface UsernameSearchProgress {
  total: number;
  checked: number;
  found: number;
  results: SiteResult[];
}

interface WhatsMyNameSite {
  name: string;
  uri_check: string;
  e_code: number;
  e_string: string;
  m_string: string;
  m_code: number;
  known: string[];
  cat: string;
  valid?: boolean;
}

const WHATSMYNAME_URL =
  "https://raw.githubusercontent.com/WebBreacher/WhatsMyName/main/wmn-data.json";

let cachedSites: WhatsMyNameSite[] | null = null;

async function fetchSiteList(): Promise<WhatsMyNameSite[]> {
  if (cachedSites) return cachedSites;

  const res = await fetch(WHATSMYNAME_URL);
  if (!res.ok) throw new Error("Failed to fetch site database");
  const data = await res.json();
  cachedSites = data.sites as WhatsMyNameSite[];
  return cachedSites;
}

export async function searchUsername(
  username: string,
  onProgress: (progress: UsernameSearchProgress) => void,
  signal?: AbortSignal
): Promise<SiteResult[]> {
  const sites = await fetchSiteList();

  // Filter to sites that have valid check info
  const validSites = sites.filter(
    (s) => s.uri_check && s.e_code && s.e_string
  );

  const results: SiteResult[] = [];
  const total = validSites.length;
  let checked = 0;
  let found = 0;

  // Process in batches of 10 concurrent requests
  const BATCH_SIZE = 10;

  for (let i = 0; i < validSites.length; i += BATCH_SIZE) {
    if (signal?.aborted) break;

    const batch = validSites.slice(i, i + BATCH_SIZE);
    const promises = batch.map(async (site) => {
      const url = site.uri_check.replace("{account}", username);
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 5000);

        const res = await fetch(url, {
          method: "GET",
          mode: "no-cors",
          signal: controller.signal,
          redirect: "follow",
        });

        clearTimeout(timeout);

        // With no-cors we get opaque responses (status 0)
        // We can only reliably detect via status code for same-origin
        // For cross-origin no-cors, type "opaque" means request completed
        const result: SiteResult = {
          name: site.name,
          category: site.cat,
          url,
          status: res.type === "opaque" || res.status === site.e_code ? "found" : "not_found",
        };

        // For opaque responses, we assume "found" since the request didn't fail
        // This is a best-effort approach from the browser
        if (res.type === "opaque") {
          result.status = "found";
        }

        return result;
      } catch {
        return {
          name: site.name,
          category: site.cat,
          url,
          status: "not_found" as const,
        };
      }
    });

    const batchResults = await Promise.all(promises);
    for (const result of batchResults) {
      results.push(result);
      checked++;
      if (result.status === "found") found++;
    }

    onProgress({ total, checked, found, results: [...results] });
  }

  return results;
}

// Curated list of popular sites to check with CORS-friendly approach
const POPULAR_SITES = [
  { name: "GitHub", url: "https://api.github.com/users/{username}", cat: "coding" },
  { name: "GitLab", url: "https://gitlab.com/api/v4/users?username={username}", cat: "coding" },
  { name: "Reddit", url: "https://www.reddit.com/user/{username}/about.json", cat: "social" },
  { name: "Medium", url: "https://medium.com/@{username}?format=json", cat: "social" },
  { name: "Dev.to", url: "https://dev.to/api/users/by_username?url={username}", cat: "coding" },
  { name: "Hackernews", url: "https://hacker-news.firebaseio.com/v0/user/{username}.json", cat: "coding" },
  { name: "Keybase", url: "https://keybase.io/_/api/1.0/user/lookup.json?usernames={username}", cat: "social" },
  { name: "Gravatar", url: "https://en.gravatar.com/{username}.json", cat: "social" },
  { name: "npm", url: "https://registry.npmjs.org/-/user/org.couchdb.user:{username}", cat: "coding" },
  { name: "PyPI", url: "https://pypi.org/pypi/{username}/json", cat: "coding" },
  { name: "Pastebin", url: "https://pastebin.com/u/{username}", cat: "coding" },
  { name: "Replit", url: "https://replit.com/@{username}", cat: "coding" },
  { name: "Lichess", url: "https://lichess.org/api/user/{username}", cat: "gaming" },
  { name: "Chess.com", url: "https://api.chess.com/pub/player/{username}", cat: "gaming" },
  { name: "Roblox", url: "https://api.roblox.com/users/get-by-username?username={username}", cat: "gaming" },
];

export async function searchUsernameSmart(
  username: string,
  onProgress: (progress: UsernameSearchProgress) => void,
  signal?: AbortSignal
): Promise<SiteResult[]> {
  const results: SiteResult[] = [];
  const total = POPULAR_SITES.length;
  let checked = 0;
  let found = 0;

  const BATCH_SIZE = 5;

  for (let i = 0; i < POPULAR_SITES.length; i += BATCH_SIZE) {
    if (signal?.aborted) break;

    const batch = POPULAR_SITES.slice(i, i + BATCH_SIZE);
    const promises = batch.map(async (site) => {
      const url = site.url.replace("{username}", encodeURIComponent(username));
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 8000);

        const res = await fetch(url, {
          signal: controller.signal,
          headers: { Accept: "application/json" },
        });

        clearTimeout(timeout);

        const isFound =
          res.ok &&
          res.status === 200;

        // Extra validation for specific APIs
        if (isFound && site.name === "GitLab") {
          const data = await res.json();
          return {
            name: site.name,
            category: site.cat,
            url: `https://gitlab.com/${username}`,
            status: (Array.isArray(data) && data.length > 0 ? "found" : "not_found") as "found" | "not_found",
          };
        }

        if (isFound && site.name === "Roblox") {
          const data = await res.json();
          return {
            name: site.name,
            category: site.cat,
            url: `https://www.roblox.com/users/${data.Id}/profile`,
            status: (data.Id ? "found" : "not_found") as "found" | "not_found",
          };
        }

        return {
          name: site.name,
          category: site.cat,
          url: url.includes("api.") ? `https://${site.name.toLowerCase().replace(/\s/g, "")}.com/${username}` : url,
          status: (isFound ? "found" : "not_found") as "found" | "not_found",
          httpStatus: res.status,
        };
      } catch {
        return {
          name: site.name,
          category: site.cat,
          url: site.url.replace("{username}", username),
          status: "error" as const,
        };
      }
    });

    const batchResults = await Promise.all(promises);
    for (const result of batchResults) {
      results.push(result);
      checked++;
      if (result.status === "found") found++;
    }

    onProgress({ total, checked, found, results: [...results] });
  }

  return results;
}
