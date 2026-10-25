export type RemoteGame = {
  pgn: string;
  white: string;
  black: string;
  result: string;
  date: string;
};
let blockedUntil = 0;
async function request(url: string, accept = "application/json") {
  if (Date.now() < blockedUntil) throw new Error("rate");
  const response = await fetch(url, {
    headers: { Accept: accept },
    signal: AbortSignal.timeout(25000),
  });
  if (response.status === 429) {
    blockedUntil =
      Date.now() +
      Math.max(60000, Number(response.headers.get("Retry-After") || 60) * 1000);
    throw new Error("rate");
  }
  if (response.status === 404) throw new Error("profile");
  if (!response.ok) throw new Error("network");
  return response;
}
export async function fetchGames(
  platform: string,
  username: string,
): Promise<RemoteGame[]> {
  if (!/^[a-zA-Z0-9_-]{1,50}$/.test(username)) throw new Error("profile");
  const name = encodeURIComponent(username);
  if (platform === "lichess") {
    const response = await request(
      `https://lichess.org/api/games/user/${name}?max=20&pgnInJson=true&opening=true&clocks=false&ongoing=false&finished=true&perfType=ultraBullet,bullet,blitz,rapid,classical,correspondence`,
      "application/x-ndjson",
    );
    const text = await response.text();
    return text
      .trim()
      .split("\n")
      .filter(Boolean)
      .map((line) => {
        const g = JSON.parse(line);
        return {
          pgn: g.pgn,
          white: g.players.white.user?.name || "Anonymous",
          black: g.players.black.user?.name || "Anonymous",
          result:
            g.winner === "white" ? "1-0" : g.winner === "black" ? "0-1" : "½-½",
          date: new Date(g.createdAt).toLocaleDateString(),
        };
      });
  }
  const { archives } = await (
    await request(`https://api.chess.com/pub/player/${name}/games/archives`)
  ).json();
  const games: RemoteGame[] = [];
  for (const url of [...archives].reverse().slice(0, 3)) {
    if (
      !/^https:\/\/api\.chess\.com\/pub\/player\/[^/]+\/games\/\d{4}\/\d{2}$/.test(
        url,
      )
    )
      continue;
    const data = await (await request(url)).json();
    for (const g of [...data.games].reverse())
      if (g.rules === "chess" && g.pgn)
        games.push({
          pgn: g.pgn,
          white: g.white.username,
          black: g.black.username,
          result:
            g.white.result === "win"
              ? "1-0"
              : g.black.result === "win"
                ? "0-1"
                : "½-½",
          date: new Date(g.end_time * 1000).toLocaleDateString(),
        });
    if (games.length >= 20) break;
  }
  return games.slice(0, 20);
}
