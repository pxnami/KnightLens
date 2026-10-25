import { afterEach, describe, expect, it, vi } from "vitest";
import { Chess } from "chess.js";
import { fetchGamePage, resolveProfile } from "./api";
import { parseInfo, finishSearch } from "./uci";
import { analyzeGame } from "./analysis";
import { classify, formatEvaluation, parseGame, type Position } from "./chess";

afterEach(() => vi.unstubAllGlobals());
const score = (cp: number, best: string): Position => ({
  cp,
  best,
  pv: [best],
  depth: 16,
});

describe("profile import regressions", () => {
  it("resolves profile links to the correct platform", () => {
    expect(
      resolveProfile("https://lichess.org/@/Gothamkxan", "chesscom"),
    ).toEqual({ platform: "lichess", username: "Gothamkxan" });
    expect(resolveProfile("chess.com/member/Gothamkxan", "lichess")).toEqual({
      platform: "chesscom",
      username: "gothamkxan",
    });
  });
  it("searches beyond three empty archive months and preserves overflow", async () => {
    const records = Array.from({ length: 25 }, (_, i) => ({
      uuid: String(i),
      url: `https://www.chess.com/game/${i}`,
      rules: "chess",
      pgn: "1. e4 *",
      white: { username: "A", result: "win" },
      black: { username: "B", result: "resigned" },
      end_time: 1000 + i,
      time_class: "rapid",
    }));
    const fetcher = vi.fn(
      async (url: string) =>
        new Response(
          JSON.stringify(
            url.endsWith("archives")
              ? {
                  archives: [
                    "https://api.chess.com/pub/player/test/games/2020/01",
                    "https://api.chess.com/pub/player/test/games/2020/02",
                    "https://api.chess.com/pub/player/test/games/2020/03",
                    "https://api.chess.com/pub/player/test/games/2020/04",
                  ],
                }
              : { games: url.endsWith("2020/01") ? records : [] },
          ),
        ),
    );
    vi.stubGlobal("fetch", fetcher);
    const first = await fetchGamePage("chesscom", "test");
    expect(first.games).toHaveLength(20);
    expect(first.games[0].id).toBe("24");
    const second = await fetchGamePage("chesscom", "test", {
      cursor: first.next,
    });
    expect(second.games).toHaveLength(5);
    expect(second.next).toBeUndefined();
    expect(
      new Set([...first.games, ...second.games].map((g) => g.id)).size,
    ).toBe(25);
  });
  it("paginates Lichess with the last displayed timestamp", async () => {
    const records = Array.from({ length: 21 }, (_, i) => ({
      id: String(i),
      variant: "standard",
      pgn: "1. e4 *",
      players: {
        white: { user: { name: "A" } },
        black: { user: { name: "B" } },
      },
      status: "mate",
      winner: "white",
      createdAt: 100000 - i * 1000,
      speed: "rapid",
    }));
    const fetcher = vi.fn(
      async (_url: string) =>
        new Response(records.map((g) => JSON.stringify(g)).join("\n")),
    );
    vi.stubGlobal("fetch", fetcher);
    const first = await fetchGamePage("lichess", "test");
    expect(first.games).toHaveLength(20);
    expect(first.next).toMatchObject({ until: 80999 });
    await fetchGamePage("lichess", "test", { cursor: first.next });
    expect(fetcher.mock.calls[1][0]).toContain("until=80999");
  });
  it("does not send an already cancelled search", async () => {
    const fetcher = vi.fn();
    vi.stubGlobal("fetch", fetcher);
    const controller = new AbortController();
    controller.abort();
    await expect(
      fetchGamePage("lichess", "test", { signal: controller.signal }),
    ).rejects.toThrow();
    expect(fetcher).not.toHaveBeenCalled();
  });
});

describe("engine score regressions", () => {
  it("uses the final best move and ignores bound scores and shallower alternatives", () => {
    const lines = [
      "info depth 15 multipv 1 score cp 70 pv d2d4 d7d5",
      "info depth 16 multipv 1 score cp 25 pv e2e4 e7e5",
      "info depth 15 multipv 2 score cp 20 pv d2d4 d7d5",
      "info depth 17 score cp 100 lowerbound pv e2e4",
    ]
      .map((line) => parseInfo(line, 1))
      .filter((x) => x !== undefined);
    const result = finishSearch(lines, "e2e4", new Chess().fen());
    expect(result.cp).toBe(25);
    expect(result.depth).toBe(16);
    expect(result.second).toBeUndefined();
    expect(parseInfo("info depth 10 score mate 2 pv h4e1", -1)?.mate).toBe(-2);
  });
  it("does not penalize the preferred move when the next search score changes", () => {
    const game = parseGame("1. a3 *");
    const result = classify(game, 0, score(20, "a2a3"), score(-300, "e7e5"));
    expect(result.category).toBe("best");
    expect(result.loss).toBe(0);
    expect(result.accuracy).toBe(100);
  });
  it("uses the latest exact score when a root move is updated at the same depth", () => {
    const lines = ["info depth 16 score cp 20 pv e2e4", "info depth 16 score cp 30 pv e2e4"].map(line => parseInfo(line, 1)!);
    expect(finishSearch(lines, "e2e4", new Chess().fen()).cp).toBe(30);
  });
  it("compares the played move at the same root and keeps repetition history", async () => {
    const game = parseGame("1. a3 a6 *");
    const evaluate = vi
      .fn()
      .mockResolvedValueOnce(score(50, "e2e4"))
      .mockResolvedValueOnce(score(-50, "a2a3"))
      .mockResolvedValueOnce(score(-30, "a7a6"))
      .mockResolvedValueOnce(score(200, "e2e4"));
    const result = await analyzeGame(game, { evaluate }, 16, () => {});
    expect(evaluate.mock.calls[1][0]).toBe(game.fens[0]);
    expect(evaluate.mock.calls[1][2].searchMoves).toEqual(["a2a3"]);
    expect(evaluate.mock.calls[3][2].moves).toEqual(["a2a3", "a7a6"]);
    expect(result.reviews[0].loss).toBe(100);
    expect(result.reviews[1].accuracy).toBe(100);
  });
  it("formats mate without inventing a pawn evaluation", () => {
    expect(formatEvaluation({ ...score(9999, ""), mate: 1 })).toBe("+M1");
    expect(formatEvaluation({ ...score(-10000, ""), mate: 0 })).toBe("#");
  });
  it("does not call a defended equal queen exchange brilliant", () => {
    const game = parseGame(
      '[SetUp "1"]\n[FEN "3q3k/8/8/8/8/2P5/8/3Q3K w - - 0 1"]\n\n1. Qd4+ *',
    );
    expect(
      classify(game, 0, score(0, "d1d4"), score(0, "d8d4")).category,
    ).not.toBe("brilliant");
  });
});

it("keeps Chess.com rate limits from blocking Lichess and honors Retry-After", async () => {
  const fetcher = vi.fn(async (url: string) =>
    url.startsWith("https://api.chess.com")
      ? new Response("", { status: 429, headers: { "Retry-After": "120" } })
      : new Response(""),
  );
  vi.stubGlobal("fetch", fetcher);
  const start = Date.now();
  await expect(fetchGamePage("chesscom", "ratetest")).rejects.toMatchObject({
    code: "rate",
    retryAt: expect.any(Number),
  });
  await expect(fetchGamePage("chesscom", "ratetest")).rejects.toMatchObject({
    code: "rate",
    retryAt: expect.any(Number),
  });
  expect(fetcher).toHaveBeenCalledTimes(1);
  expect((await fetchGamePage("lichess", "ratetest")).games).toEqual([]);
  expect(Date.now() - start).toBeLessThan(120000);
});
