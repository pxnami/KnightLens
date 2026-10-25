import { Chess, type Move } from "chess.js";
export type Lang = "de" | "en";
export const categories = [
  "brilliant",
  "great",
  "book",
  "best",
  "excellent",
  "good",
  "inaccuracy",
  "mistake",
  "miss",
  "blunder",
] as const;
export type Category = (typeof categories)[number];
export const labels: Record<Category, [string, string, string, string]> = {
  brilliant: ["Brillant", "Brilliant", "!!", "#53cbbb"],
  great: ["Großartig", "Great", "!", "#79b5df"],
  book: ["Theorie", "Book", "B", "#d6ad82"],
  best: ["Am besten", "Best", "★", "#b4d47a"],
  excellent: ["Exzellent", "Excellent", "+", "#a3c47a"],
  good: ["Gut", "Good", "✓", "#a5b793"],
  inaccuracy: ["Ungenau", "Inaccuracy", "?!", "#edcf68"],
  mistake: ["Fehler", "Mistake", "?", "#eea461"],
  miss: ["Verpasst", "Miss", "×", "#ee8d82"],
  blunder: ["Patzer", "Blunder", "??", "#ec6969"],
};
export type Position = {
  cp: number;
  mate?: number;
  best: string;
  pv: string[];
  depth: number;
  second?: number;
};
export type Review = {
  category: Category;
  loss: number;
  accuracy: number;
  before: Position;
  after: Position;
};
export type Game = {
  pgn: string;
  moves: Move[];
  fens: string[];
  headers: Record<string, string>;
};
export function parseGame(pgn: string): Game {
  const chess = new Chess();
  chess.loadPgn(pgn);
  const moves = chess.history({ verbose: true });
  if (!moves.length) throw new Error("empty");
  if (moves.length > 1200) throw new Error("long");
  return {
    pgn: chess.pgn(),
    moves,
    fens: [moves[0].before, ...moves.map((m) => m.after)],
    headers: chess.getHeaders(),
  };
}
export function splitPgn(text: string) {
  return text
    .trim()
    .split(/\n\s*\n(?=\s*\[Event\s)/)
    .filter(Boolean);
}
const openingLines = [
  "e4 e5 Nf3 Nc6 Bb5 a6 Ba4 Nf6 O-O Be7",
  "e4 e5 Nf3 Nc6 Bc4 Bc5 c3 Nf6",
  "e4 c5 Nf3 d6 d4 cxd4 Nxd4 Nf6 Nc3",
  "d4 d5 c4 e6 Nc3 Nf6",
  "d4 Nf6 c4 g6 Nc3 Bg7",
  "e4 e6 d4 d5 Nc3",
  "e4 c6 d4 d5",
  "Nf3 d5 g3 Nf6 Bg2",
];
export function classify(
  game: Game,
  index: number,
  before: Position,
  after: Position,
): Review {
  const move = game.moves[index],
    sign = move.color === "w" ? 1 : -1;
  const start = before.cp * sign,
    end = after.cp * sign;
  const loss = Math.max(0, start - end);
  const win = (cp: number) => 100 / (1 + Math.exp(-cp / 250));
  const swing = Math.max(0, win(start) - win(end));
  const exact = before.best === move.from + move.to + (move.promotion || "");
  let category: Category =
    swing >= 20 || loss >= 300
      ? "blunder"
      : swing >= 10 || loss >= 150
        ? "mistake"
        : swing >= 5 || loss >= 70
          ? "inaccuracy"
          : loss <= 12
            ? "excellent"
            : "good";
  if (
    (start >= 150 && end < 50 && loss >= 150) ||
    (before.mate &&
      before.mate * sign > 0 &&
      !(after.mate && after.mate * sign > 0) &&
      end < 250)
  )
    category = "miss";
  if (exact) category = "best";
  const sequence = game.moves
    .slice(0, index + 1)
    .map((m) => m.san)
    .join(" ");
  if (
    openingLines.some(
      (line) => line === sequence || line.startsWith(sequence + " "),
    )
  )
    category = "book";
  const position = new Chess(move.after);
  const values: Record<string, number> = {
    p: 1,
    n: 3,
    b: 3,
    r: 5,
    q: 9,
    k: 100,
  };
  const sacrificed =
    position
      .moves({ verbose: true })
      .some((reply) => reply.to === move.to && !!reply.captured) &&
    values[move.piece] > (move.captured ? values[move.captured] : 0) + 1;
  if (
    exact &&
    before.second !== undefined &&
    start - before.second * sign > 120 &&
    category !== "book"
  )
    category = "great";
  if (
    exact &&
    sacrificed &&
    loss <= 25 &&
    end >= -50 &&
    move.piece !== "k" &&
    category !== "book"
  )
    category = "brilliant";
  return {
    category,
    loss,
    accuracy: Math.max(
      0,
      Math.min(100, 103.1668 * Math.exp(-0.04354 * swing) - 3.1668),
    ),
    before,
    after,
  };
}
export function lineSan(fen: string, pv: string[]) {
  const chess = new Chess(fen);
  const moves: string[] = [];
  for (const uci of pv.slice(0, 8)) {
    try {
      moves.push(
        chess.move({
          from: uci.slice(0, 2),
          to: uci.slice(2, 4),
          promotion: uci[4],
        }).san,
      );
    } catch {
      break;
    }
  }
  return moves.join(" ");
}
export function coach(
  game: Game,
  index: number,
  review: Review | undefined,
  lang: Lang,
) {
  const de = lang === "de",
    move = game.moves[index];
  if (!move)
    return de
      ? "Lade eine Partie und starte die Analyse. Gemeinsam finden wir die entscheidenden Momente."
      : "Load a game and start the analysis. Let’s find the moments that matter.";
  if (!review)
    return de
      ? "Dieser Zug wurde noch nicht analysiert. Starte Stockfish, um Bewertung und Alternativen zu sehen."
      : "This move has not been analyzed yet. Start Stockfish to see its evaluation and alternatives.";
  const { category, before, after, loss } = review;
  const best = lineSan(move.before, [before.best]);
  let text = de
    ? `${move.san} ist ${labels[category][0].toLowerCase()}. `
    : `${move.san} is ${labels[category][1].toLowerCase()}. `;
  if (category === "book")
    text += de
      ? "Der Zug gehört zu einer hinterlegten Eröffnungslinie. "
      : "This move follows a recognized opening line. ";
  if (category === "brilliant")
    text += de
      ? "Eine höherwertige Figur wird zum Schlagen angeboten, während die Engine die Stellung hält. Prüfe die konkrete Fortsetzung. "
      : "A higher-value piece is offered for capture while the engine preserves the position. Check the concrete continuation. ";
  if (loss >= 70)
    text += de
      ? `Du gibst etwa ${(loss / 100).toFixed(1)} Bauerneinheiten ab. Besser war ${best}. `
      : `You give up about ${(loss / 100).toFixed(1)} pawns of evaluation. ${best} was stronger. `;
  else if (category !== "book")
    text += de
      ? "Der Zug hält die Stellungsbewertung weitgehend stabil. "
      : "This move largely preserves the evaluation. ";
  if (move.san.includes("#"))
    text += de
      ? "Schachmatt: Der König hat keine legale Rettung."
      : "Checkmate: the king has no legal escape.";
  else if (move.san.includes("+"))
    text += de
      ? "Das Schach zwingt den Gegner, auf die Königsbedrohung zu reagieren. "
      : "Check forces your opponent to address the threat to their king. ";
  else if (move.isKingsideCastle() || move.isQueensideCastle())
    text += de
      ? "Die Rochade bringt den König aus dem Zentrum und verbindet die Türme. "
      : "Castling moves the king away from the center and helps connect the rooks. ";
  else if (move.captured)
    text += de
      ? `Du schlägst auf ${move.to}. Beachte mögliche Rückschläge in der Engine-Variante. `
      : `You capture on ${move.to}. Check possible recaptures in the engine line. `;
  else if (["d4", "e4", "d5", "e5"].includes(move.to))
    text += de
      ? "Die Figur besetzt ein zentrales Feld. "
      : "The piece occupies a central square. ";
  if (after.mate)
    text += de
      ? `Stockfish sieht Matt in ${Math.abs(after.mate)}. `
      : `Stockfish sees mate in ${Math.abs(after.mate)}. `;
  return text;
}
