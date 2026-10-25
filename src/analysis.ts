import { Chess } from "chess.js";
import { classify, type Game, type Position, type Review } from "./chess";
import type { SearchOptions } from "./engine";
export type AnalysisUpdate = {
  positions: Position[];
  reviews: Review[];
  phase: "position" | "move";
  ply: number;
};
export type Evaluator = {
  evaluate: (
    fen: string,
    depth: number,
    options?: SearchOptions,
  ) => Promise<Position>;
};
function terminal(
  chess: Chess,
  depth: number,
  final = false,
): Position | undefined {
  if (chess.isCheckmate())
    return {
      cp: chess.turn() === "w" ? -10000 : 10000,
      mate: 0,
      best: "",
      pv: [],
      depth,
    };
  if (
    chess.isStalemate() ||
    chess.isInsufficientMaterial() ||
    (final && (chess.isThreefoldRepetition() || chess.isDrawByFiftyMoves()))
  )
    return { cp: 0, best: "", pv: [], depth };
}
export async function analyzeGame(
  game: Game,
  engine: Evaluator,
  depth: number,
  onUpdate: (value: AnalysisUpdate) => void,
) {
  const positions: Position[] = [],
    reviews: Review[] = [];
  const chess = new Chess(game.fens[0]);
  const history: string[] = [];
  const context = (): SearchOptions => ({
    initialFen: game.fens[0],
    moves: [...history],
  });
  let before =
    terminal(chess, depth) ||
    (await engine.evaluate(chess.fen(), depth, context()));
  positions.push(before);
  onUpdate({
    positions: [...positions],
    reviews: [],
    phase: "position",
    ply: 0,
  });
  for (let index = 0; index < game.moves.length; index++) {
    const move = game.moves[index],
      uci = move.from + move.to + (move.promotion || "");
    onUpdate({
      positions: [...positions],
      reviews: [...reviews],
      phase: "move",
      ply: index + 1,
    });
    const played =
      before.best === uci
        ? before
        : await engine.evaluate(chess.fen(), depth, {
            ...context(),
            searchMoves: [uci],
          });
    chess.move({ from: move.from, to: move.to, promotion: move.promotion });
    history.push(uci);
    const after =
      terminal(chess, depth, index === game.moves.length - 1) ||
      (await engine.evaluate(chess.fen(), depth, context()));
    positions.push(after);
    reviews.push(classify(game, index, before, after, played));
    onUpdate({
      positions: [...positions],
      reviews: [...reviews],
      phase: "position",
      ply: index + 1,
    });
    before = after;
  }
  return { positions, reviews };
}
