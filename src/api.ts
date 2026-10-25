export type Platform = "chesscom" | "lichess";
export type RemoteGame = {
  id?: string;
  platform?: Platform;
  pgn: string;
  white: string;
  black: string;
  result: string;
  date: string;
  timestamp?: number;
  url?: string;
  timeClass?: string;
};
export type GameCursor =
  | {
      platform: "chesscom";
      username: string;
      months: string[];
      index: number;
      pending: RemoteGame[];
    }
  | { platform: "lichess"; username: string; until: number };
export type GamePage = {
  games: RemoteGame[];
  next?: GameCursor;
  fetchedAt: number;
};
export type FetchOptions = {
  signal?: AbortSignal;
  cursor?: GameCursor;
  onProgress?: (scanned: number, total: number) => void;
};
const queues = new Map<string, Promise<unknown>>();
const blockedUntil = new Map<string, number>();
const PAGE_SIZE = 20;
export class ImportError extends Error {
  constructor(
    public code: "profile" | "rate" | "network" | "timeout" | "invalid",
    public retryAt?: number,
  ) {
    super(code);
  }
}
export function resolveProfile(input: string, platform: Platform) {
  let username = input.trim().replace(/^@/, "");
  if (
    /^(?:https?:\/\/)?(?:www\.)?(?:chess\.com|lichess\.org)\//i.test(username)
  ) {
    const url = new URL(
      /^https?:/i.test(username) ? username : `https://${username}`,
    );
    const parts = url.pathname.split("/").filter(Boolean);
    if (
      url.hostname.replace(/^www\./, "") === "chess.com" &&
      parts[0] === "member"
    ) {
      platform = "chesscom";
      username = parts[1] || "";
    } else if (
      url.hostname.replace(/^www\./, "") === "lichess.org" &&
      parts[0] === "@"
    ) {
      platform = "lichess";
      username = parts[1] || "";
    } else throw new ImportError("invalid");
  }
  if (!/^[a-zA-Z0-9_-]{1,50}$/.test(username)) throw new ImportError("invalid");
  return {
    platform,
    username: platform === "chesscom" ? username.toLowerCase() : username,
  };
}
async function request(
  url: string,
  accept: string,
  signal?: AbortSignal,
  optional = false,
): Promise<string | null> {
  const origin = new URL(url).origin;
  const previous = queues.get(origin) || Promise.resolve();
  const operation = previous
    .catch(() => undefined)
    .then(async () => {
      signal?.throwIfAborted();
      const retryAt = blockedUntil.get(origin) || 0;
      if (Date.now() < retryAt) throw new ImportError("rate", retryAt);
      const timeout = AbortSignal.timeout(30000);
      try {
        const response = await fetch(url, {
          headers: { Accept: accept },
          cache: "no-cache",
          signal: signal ? AbortSignal.any([signal, timeout]) : timeout,
        });
        if (response.status === 429) {
          const retry = response.headers.get("Retry-After");
          const delay =
            retry && /^\d+$/.test(retry)
              ? Number(retry) * 1000
              : retry
                ? Date.parse(retry) - Date.now()
                : 60000;
          const until =
            Date.now() +
            Math.max(60000, Number.isFinite(delay) ? delay : 60000);
          blockedUntil.set(origin, until);
          throw new ImportError("rate", until);
        }
        if (optional && (response.status === 404 || response.status === 410))
          return null;
        if (response.status === 404) throw new ImportError("profile");
        if (!response.ok) throw new ImportError("network");
        return await response.text();
      } catch (error) {
        if (signal?.aborted) throw signal.reason;
        if (timeout.aborted) throw new ImportError("timeout");
        if (error instanceof ImportError) throw error;
        throw new ImportError("network");
      }
    });
  queues.set(origin, operation);
  return operation;
}
function readJson(text: string | null) {
  try {
    return JSON.parse(text || "null");
  } catch {
    throw new ImportError("network");
  }
}
type ChessComRecord = {
  uuid?: string;
  url: string;
  rules: string;
  pgn: string;
  white: { username: string; result: string };
  black: { username: string; result: string };
  end_time: number;
  time_class: string;
};
type LichessRecord = {
  id: string;
  variant?: string;
  pgn: string;
  players: {
    white: { user?: { name: string } };
    black: { user?: { name: string } };
  };
  winner?: string;
  status: string;
  createdAt: number;
  speed: string;
};
export async function fetchGamePage(
  platform: Platform,
  input: string,
  options: FetchOptions = {},
): Promise<GamePage> {
  const profile = resolveProfile(input, platform);
  const { signal, cursor, onProgress } = options;
  platform = profile.platform;
  const username = profile.username;
  if (
    cursor &&
    (cursor.platform !== platform ||
      cursor.username.toLowerCase() !== username.toLowerCase())
  )
    throw new ImportError("invalid");
  const name = encodeURIComponent(username);
  if (platform === "lichess") {
    const query = new URLSearchParams({
      max: String(PAGE_SIZE + 1),
      pgnInJson: "true",
      opening: "true",
      clocks: "false",
      evals: "false",
      ongoing: "false",
      finished: "true",
      sort: "dateDesc",
      perfType: "ultraBullet,bullet,blitz,rapid,classical,correspondence",
    });
    if (cursor?.platform === "lichess")
      query.set("until", String(cursor.until));
    const text = await request(
      `https://lichess.org/api/games/user/${name}?${query}`,
      "application/x-ndjson",
      signal,
    );
    const records: LichessRecord[] = (text || "")
      .split(/\r?\n/)
      .filter((line) => line.trim())
      .map((line) => readJson(line));
    const games: RemoteGame[] = records
      .filter(
        (g) =>
          (!g.variant || g.variant === "standard") && typeof g.pgn === "string",
      )
      .map<RemoteGame>((g) => ({
        id: g.id,
        platform: "lichess",
        pgn: g.pgn,
        white: g.players.white.user?.name || "Anonymous",
        black: g.players.black.user?.name || "Anonymous",
        result:
          g.winner === "white"
            ? "1-0"
            : g.winner === "black"
              ? "0-1"
              : g.status === "aborted"
                ? "*"
                : "½-½",
        date: new Date(g.createdAt).toISOString(),
        timestamp: g.createdAt,
        url: `https://lichess.org/${g.id}`,
        timeClass: g.speed,
      }))
      .sort((a, b) => b.timestamp! - a.timestamp!);
    const page = games.slice(0, PAGE_SIZE),
      last = page.at(-1);
    return {
      games: page,
      next:
        games.length > PAGE_SIZE && last?.timestamp
          ? { platform, username, until: last.timestamp - 1 }
          : undefined,
      fetchedAt: Date.now(),
    };
  }
  let months: string[], index: number, pending: RemoteGame[];
  if (cursor?.platform === "chesscom") {
    months = cursor.months;
    index = cursor.index;
    pending = [...cursor.pending];
  } else {
    const data = readJson(
      await request(
        `https://api.chess.com/pub/player/${name}/games/archives`,
        "application/json",
        signal,
      ),
    );
    if (!Array.isArray(data?.archives)) throw new ImportError("network");
    const currentMonth = new Date().toISOString().slice(0, 7).replace("-", "/");
    const archived = data.archives
      .map(
        (url: string) =>
          /^https:\/\/api\.chess\.com\/pub\/player\/[^/]+\/games\/(\d{4}\/\d{2})$/.exec(
            url,
          )?.[1],
      )
      .filter(Boolean) as string[];
    months = [...new Set([currentMonth, ...archived])].sort().reverse();
    index = 0;
    pending = [];
  }
  while (pending.length < PAGE_SIZE && index < months.length) {
    signal?.throwIfAborted();
    const month = months[index++];
    onProgress?.(index, months.length);
    const text = await request(
      `https://api.chess.com/pub/player/${name}/games/${month}`,
      "application/json",
      signal,
      true,
    );
    if (text === null) continue;
    const data = readJson(text);
    if (!Array.isArray(data?.games)) throw new ImportError("network");
    const games: RemoteGame[] = (data.games as ChessComRecord[])
      .filter((g) => g.rules === "chess" && typeof g.pgn === "string")
      .map<RemoteGame>((g) => ({
        id: g.uuid || g.url,
        platform: "chesscom",
        pgn: g.pgn,
        white: g.white.username,
        black: g.black.username,
        result:
          g.white.result === "win"
            ? "1-0"
            : g.black.result === "win"
              ? "0-1"
              : "½-½",
        date: new Date(g.end_time * 1000).toISOString(),
        timestamp: g.end_time * 1000,
        url: g.url,
        timeClass: g.time_class,
      }));
    pending.push(...games.sort((a, b) => b.timestamp! - a.timestamp!));
  }
  const page = pending.splice(0, PAGE_SIZE);
  return {
    games: page,
    next:
      pending.length || index < months.length
        ? { platform: "chesscom", username, months, index, pending }
        : undefined,
    fetchedAt: Date.now(),
  };
}
export async function fetchGames(platform: Platform, username: string) {
  return (await fetchGamePage(platform, username)).games;
}
