import { categories, labels, type Game, type Lang, type Review } from "./chess";
type Translate = (de: string, en: string) => string;
type Props = {
  t: Translate;
  white: string;
  black: string;
  accuracy: (color: string) => string;
  lang: Lang;
  reviews: Review[];
  game: Game | undefined;
  ply: number;
  changePly: (ply: number) => void;
  setTab: (tab: string) => void;
};
export function Overview({
  t,
  white,
  black,
  accuracy,
  lang,
  reviews,
  game,
  ply,
  changePly,
  setTab,
}: Props) {
  return (
    <div className="overview">
      <div className="accuracy">
        <div>
          <span>{white}</span>
          <strong>
            {accuracy("w")}
            <small>%</small>
          </strong>
        </div>
        <div>
          <span>{black}</span>
          <strong>
            {accuracy("b")}
            <small>%</small>
          </strong>
        </div>
      </div>
      <p className="estimate-note">
        {t(
          "Eigene Genauigkeitsschätzung · analysierte Züge",
          "Independent accuracy estimate · analyzed moves",
        )}
      </p>
      <div className="category-heading">
        <span>{t("Zugqualität", "Move quality")}</span>
        <span>{t("Weiß", "White")}</span>
        <span>{t("Schwarz", "Black")}</span>
      </div>
      {categories.map((category) => (
        <div className="category-row" key={category}>
          <span>
            <span className="badge" style={{ color: labels[category][3] }}>
              {labels[category][2]}
            </span>
            {labels[category][lang === "de" ? 0 : 1]}
          </span>
          {["w", "b"].map((color) => (
            <button
              key={color}
              disabled={
                !reviews.some(
                  (r, i) =>
                    r.category === category && game?.moves[i].color === color,
                )
              }
              onClick={() => {
                const index = reviews.findIndex(
                  (r, i) =>
                    r.category === category &&
                    game?.moves[i].color === color &&
                    i >= ply,
                );
                const first = reviews.findIndex(
                  (r, i) =>
                    r.category === category && game?.moves[i].color === color,
                );
                changePly((index < 0 ? first : index) + 1);
                setTab("moves");
              }}
              style={{ color: labels[category][3] }}
            >
              {
                reviews.filter(
                  (r, i) =>
                    r.category === category && game?.moves[i].color === color,
                ).length
              }
            </button>
          ))}
        </div>
      ))}
      <p className="estimate-note">
        {t(
          "Kategorien sind eigene Heuristiken, keine Chess.com-Bewertungen.",
          "Categories use independent heuristics, not Chess.com ratings.",
        )}
      </p>
    </div>
  );
}
