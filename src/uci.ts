import { Chess } from "chess.js";
import type { Position } from "./chess";
export type UciInfo = Position & { multipv: number };
export function parseInfo(line: string, sign: number): UciInfo | undefined {
  if (!line.startsWith("info ") || /\b(?:lowerbound|upperbound)\b/.test(line))
    return;
  const score = line.match(/\bscore (cp|mate) (-?\d+)\b/),
    depth = line.match(/\bdepth (\d+)\b/),
    pv = line.match(/\bpv (.+)$/);
  if (!score || !depth) return;
  const value = Number(score[2]);
  const moves = pv?.[1].trim().split(/\s+/) || [];
  return {
    cp:
      (score[1] === "mate"
        ? Math.sign(value) * (10000 - Math.min(999, Math.abs(value)))
        : value) * sign,
    mate: score[1] === "mate" ? value * sign : undefined,
    best: moves[0] || "",
    pv: moves,
    depth: Number(depth[1]),
    multipv: Number(line.match(/\bmultipv (\d+)\b/)?.[1] || 1),
  };
}
export function finishSearch(
  lines: UciInfo[],
  best: string,
  fen: string,
): Position {
  const candidates = lines
    .filter((info) => info.best === best)
    .sort((a, b) => b.depth - a.depth);
  const result = candidates[0];
  if (!result)
    throw new Error("Stockfish returned no exact score for its best move");
  const chess = new Chess(fen);
  chess.move({
    from: best.slice(0, 2),
    to: best.slice(2, 4),
    promotion: best[4],
  });
  const second = lines
    .filter(
      (info) =>
        info.best !== best && info.depth === result.depth && info.multipv === 2,
    )
    .at(-1);
  return {
    cp: result.cp,
    mate: result.mate,
    best,
    pv: result.pv,
    depth: result.depth,
    second: second?.cp,
  };
}
