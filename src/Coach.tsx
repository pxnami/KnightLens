import { ArrowRight, Lightbulb } from "lucide-react";
import {
  coach,
  labels,
  lineSan,
  type Game,
  type Lang,
  type Review,
} from "./chess";
import { themeAssets } from "./theme";
type Props = {
  game?: Game;
  ply: number;
  review?: Review;
  lang: Lang;
  score: string;
  variation?: string;
  explaining: boolean;
  setExplaining: (value: boolean) => void;
  onNext: () => void;
};
export function Coach({
  game,
  ply,
  review,
  lang,
  score,
  variation,
  explaining,
  setExplaining,
  onNext,
}: Props) {
  const t = (de: string, en: string) => (lang === "de" ? de : en);
  const move = game?.moves[ply - 1];
  const label = review ? labels[review.category] : undefined;
  const explanation = coach(
    game || { moves: [], fens: [], headers: {}, pgn: "" },
    ply - 1,
    review,
    lang,
  );
  const summary =
    !move || !review
      ? explanation
      : move.san.includes("#")
        ? t(
            "Schachmatt! Der gegnerische König hat keine legale Rettung.",
            "Checkmate! The opposing king has no legal escape.",
          )
        : review.category === "brilliant"
          ? t(
              "Ein starkes Opfer! Du bietest Material an und hältst die Bewertung.",
              "A strong sacrifice! You offer material while preserving the evaluation.",
            )
          : review.loss >= 70
            ? t(
                `Besser war ${lineSan(move.before, [review.before.best])}. Dieser Zug kostet etwa ${(review.loss / 100).toFixed(1)} Bauerneinheiten.`,
                `${lineSan(move.before, [review.before.best])} was stronger. This move costs about ${(review.loss / 100).toFixed(1)} pawns of evaluation.`,
              )
            : review.category === "book"
              ? t(
                  "Ein bekannter Eröffnungszug aus unserem Eröffnungsrepertoire.",
                  "A recognized opening move from our opening repertoire.",
                )
              : move.san.includes("+")
                ? t(
                    "Du gibst Schach und zwingst deinen Gegner, die Königsbedrohung zu beantworten.",
                    "You give check, forcing your opponent to address the threat to their king.",
                  )
                : t(
                    "Dieser Zug hält die Stellungsbewertung weitgehend stabil. Schau dir die beste Fortsetzung an.",
                    "This move largely preserves the evaluation. Take a look at the best continuation.",
                  );
  return (
    <section className="coach" aria-label={t("Dein Coach", "Your coach")}>
      <div className="coach-conversation">
        <img
          className="coach-avatar"
          src={themeAssets.coach}
          alt={t("Schachcoach", "Chess coach")}
        />
        <div className="coach-bubble">
          <div className="coach-verdict">
            {label && (
              <span className="badge" style={{ background: label[3] }}>
                {label[2]}
              </span>
            )}
            <strong>
              {variation
                ? t("Variante", "Variation") + ": " + variation
                : move
                  ? `${move.san}${label ? t(" ist ", " is ") + label[lang === "de" ? 0 : 1] : ""}`
                  : t(
                      "Schauen wir uns deine Partie an!",
                      "Let’s review your game!",
                    )}
            </strong>
            {review && !variation && (
              <span className="coach-score">{score}</span>
            )}
          </div>
          <p>
            {variation
              ? t(
                  "Du probierst eine eigene Variante aus. Kehre zur Partie zurück, um die Analyse dieses Zuges zu sehen.",
                  "You are exploring a variation. Return to the game to see this move’s analysis.",
                )
              : summary}
          </p>
        </div>
      </div>
      <div className="coach-actions">
        <button
          className="secondary"
          disabled={!review || !!variation}
          onClick={() => setExplaining(!explaining)}
        >
          <Lightbulb size={16} />
          {explaining ? t("Schließen", "Close") : t("Erklären", "Explain")}
        </button>
        <button
          className="primary"
          disabled={!game || ply === game.moves.length}
          onClick={onNext}
        >
          <ArrowRight size={19} />
          {t("Nächste", "Next")}
        </button>
      </div>
      {review && move && explaining && !variation && (
        <div className="explanation">
          <p>{explanation}</p>
          <strong>
            {t(
              "Beste Fortsetzung vor diesem Zug",
              "Best continuation before this move",
            )}
          </strong>
          <p>{lineSan(move.before, review.before.pv)}</p>
          <span>
            Stockfish 18 · {t("Tiefe", "Depth")} {review.before.depth}
          </span>
        </div>
      )}
    </section>
  );
}
