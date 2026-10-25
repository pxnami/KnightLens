import { describe, it, expect } from "vitest";
import {
  parseGame,
  splitPgn,
  classify,
  coach,
  lineSan,
  type Position,
} from "./chess";
const position = (cp: number, best = "e2e4"): Position => ({
  cp,
  best,
  pv: [best],
  depth: 14,
});
describe("PGN and chess rules", () => {
  it("preserves legal moves, headers and the final position", () => {
    const g = parseGame(
      '[White "Alice"]\n[Black "Bob"]\n\n1. e4 e5 2. Nf3 Nc6 3. Bb5 a6 *',
    );
    expect(g.headers.White).toBe("Alice");
    expect(g.moves).toHaveLength(6);
    expect(g.fens).toHaveLength(7);
    expect(g.moves[5].to).toBe("a6");
  });
  it("rejects invalid and empty games", () => {
    expect(() => parseGame("1. e4 e5 2. Qh9")).toThrow();
    expect(() => parseGame('[Event "Empty"]')).toThrow();
  });
  it("supports custom starting positions and promotion", () => {
    const g = parseGame(
      '[SetUp "1"]\n[FEN "7k/P7/8/8/8/8/8/7K w - - 0 1"]\n\n1. a8=Q+ *',
    );
    expect(g.moves[0].promotion).toBe("q");
    expect(g.fens[0]).toContain("P7");
  });
  it("splits multi-game PGN files", () => {
    expect(
      splitPgn('[Event "A"]\n\n1. e4 *\n\n[Event "B"]\n\n1. d4 *'),
    ).toHaveLength(2);
  });
  it("converts an engine line to legal notation", () => {
    const g = parseGame("1. e4 e5 *");
    expect(lineSan(g.fens[0], ["e2e4", "e7e5", "g1f3"])).toBe("e4 e5 Nf3");
  });
});
describe("evaluation and classification", () => {
  const game = parseGame("1. a3 a6 2. h3 h6 *");
  it("judges loss from the moving side, including black", () => {
    expect(classify(game, 0, position(0), position(-350)).category).toBe(
      "blunder",
    );
    expect(classify(game, 1, position(0), position(350)).category).toBe(
      "blunder",
    );
  });
  it("does not label a strong black move as a loss", () => {
    const r = classify(game, 1, position(-100, "a7a6"), position(-110));
    expect(r.category).toBe("best");
    expect(r.loss).toBe(0);
  });
  it("identifies a missed winning advantage", () => {
    expect(classify(game, 0, position(220), position(0)).category).toBe("miss");
  });
  it("only recognizes stored opening prefixes", () => {
    const opening = parseGame("1. e4 e5 2. Nf3 Nc6 *");
    expect(classify(opening, 2, position(20), position(15)).category).toBe(
      "book",
    );
    expect(classify(game, 0, position(0), position(0)).category).not.toBe(
      "book",
    );
  });
  it("keeps accuracy bounded", () => {
    for (const cp of [-10000, 0, 10000]) {
      const r = classify(game, 0, position(500), position(cp));
      expect(r.accuracy).toBeGreaterThanOrEqual(0);
      expect(r.accuracy).toBeLessThanOrEqual(100);
    }
  });
  it("explains an actual move in both languages", () => {
    const r = classify(game, 0, position(200, "e2e4"), position(-50));
    expect(coach(game, 0, r, "de")).toContain("Besser war e4");
    expect(coach(game, 0, r, "en")).toContain("e4 was stronger");
  });
});
