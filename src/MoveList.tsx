import type { ReactNode } from "react";
import { BookOpen } from "lucide-react";
import type { Game, Review, Position } from "./chess";
type Translate = (de: string, en: string) => string;
type Props = {
  t: Translate;
  game: Game | undefined;
  ply: number;
  reviews: Review[];
  positions: Position[];
  badge: (review: Review) => ReactNode;
  changePly: (ply: number) => void;
  setPlaying: (playing: boolean) => void;
  showBest: boolean;
  setShowBest: (show: boolean) => void;
};
export function MoveList({
  t,
  game,
  ply,
  reviews,
  positions,
  badge,
  changePly,
  setPlaying,
  showBest,
  setShowBest,
}: Props) {
  return (
    <div className="move-section">
      <div className="move-table">
        <div className="move-table-head">
          <span>#</span>
          <span>{t("Weiß", "White")}</span>
          <span>{t("Schwarz", "Black")}</span>
        </div>
        {game ? (
          Array.from({ length: Math.ceil(game.moves.length / 2) }, (_, i) => (
            <div className="move-row" key={i}>
              <span>{i + 1}.</span>
              {[i * 2, i * 2 + 1].map((index) =>
                game.moves[index] ? (
                  <button
                    key={index}
                    className={`move ${ply === index + 1 ? "active" : ""}`}
                    onClick={() => {
                      setPlaying(false);
                      changePly(index + 1);
                    }}
                  >
                    {reviews[index] ? (
                      badge(reviews[index])
                    ) : (
                      <span className="unrated" />
                    )}
                    <strong>{game.moves[index].san}</strong>
                    {positions[index + 1] && (
                      <small>
                        {(positions[index + 1].cp / 100).toFixed(1)}
                      </small>
                    )}
                  </button>
                ) : (
                  <span key={index} />
                ),
              )}
            </div>
          ))
        ) : (
          <div className="empty-notation">
            <BookOpen size={25} />
            <p>
              {t(
                "Die Züge deiner Partie erscheinen hier.",
                "Your game’s moves will appear here.",
              )}
            </p>
          </div>
        )}
      </div>
      <label className="best-toggle">
        <input
          type="checkbox"
          checked={showBest}
          onChange={(e) => setShowBest(e.target.checked)}
        />
        {t("Besten Zug auf dem Brett zeigen", "Show best move on the board")}
      </label>
    </div>
  );
}
