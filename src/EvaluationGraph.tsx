import { labels, type Review, type Position } from "./chess";
type Translate = (de: string, en: string) => string;
type Props = {
  t: Translate;
  positions: Position[];
  reviews: Review[];
  ply: number;
  changePly: (ply: number) => void;
};
export function EvaluationGraph({
  t,
  positions,
  reviews,
  ply,
  changePly,
}: Props) {
  return (
    <div className="graph-section">
      <div>
        <strong>{t("Partieverlauf", "Game evaluation")}</strong>
        <span>{t("aus Sicht von Weiß", "White’s perspective")}</span>
      </div>
      <svg
        className="graph"
        viewBox="0 0 400 85"
        role="img"
        aria-label={t("Bewertungsverlauf", "Evaluation graph")}
      >
        <line
          x1="0"
          x2="400"
          y1="42.5"
          y2="42.5"
          stroke="#c6c6c6"
          strokeDasharray="3 4"
        />
        {positions.length > 1 && (
          <>
            <path
              d={`M 0 42.5 ${positions.map((p, i) => `L ${(i / (positions.length - 1)) * 400} ${42.5 - Math.tanh(p.cp / 500) * 37}`).join(" ")} L 400 42.5 Z`}
              fill="#444"
              opacity=".1"
            />
            <polyline
              points={positions
                .map(
                  (p, i) =>
                    `${(i / (positions.length - 1)) * 400},${42.5 - Math.tanh(p.cp / 500) * 37}`,
                )
                .join(" ")}
              fill="none"
              stroke="#444"
              strokeWidth="2"
            />
            {positions.map((p, i) => (
              <circle
                key={i}
                cx={(i / (positions.length - 1)) * 400}
                cy={42.5 - Math.tanh(p.cp / 500) * 37}
                r={i === ply ? 4 : 2.8}
                fill={
                  i && reviews[i - 1]
                    ? labels[reviews[i - 1].category][3]
                    : "#c4d59b"
                }
                role="button"
                tabIndex={0}
                aria-label={`${t("Halbzug", "Ply")} ${i}`}
                onClick={() => changePly(i)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") changePly(i);
                }}
              />
            ))}
          </>
        )}
        {positions.length < 2 && (
          <text x="200" y="66" textAnchor="middle" fill="#666" fontSize="11">
            {t(
              "Starte die Analyse, um den Verlauf zu sehen.",
              "Start analysis to see the evaluation.",
            )}
          </text>
        )}
      </svg>
    </div>
  );
}
