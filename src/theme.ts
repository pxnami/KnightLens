export const themeAssets = {
  pieces: "https://images.chesscomfiles.com/chess-themes/pieces/neo/150",
  board: "https://images.chesscomfiles.com/chess-themes/boards/icy_sea/200.png",
  coach: "https://assets-coaches.chess.com/image/coachdanny.png",
};

export function pieceImage(color: string, piece: string) {
  return `${themeAssets.pieces}/${color}${piece}.png`;
}
