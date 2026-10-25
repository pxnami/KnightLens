import { useRef, useState } from "react";
import {
  ArrowRight,
  Upload,
  Search,
  Check,
  LoaderCircle,
  X,
} from "lucide-react";
import { parseGame, splitPgn, type Game, type Lang } from "./chess";
import { fetchGames, type RemoteGame } from "./api";
type Props = {
  lang: Lang;
  setLang: (lang: Lang) => void;
  canClose: boolean;
  onClose: () => void;
  onLoad: (game: Game) => void;
};
export function ImportDialog({
  lang,
  setLang,
  canClose,
  onClose,
  onLoad,
}: Props) {
  const t = (de: string, en: string) => (lang === "de" ? de : en);
  const [mode, setMode] = useState("profile"),
    [platform, setPlatform] = useState("chesscom"),
    [username, setUsername] = useState(""),
    [pgn, setPgn] = useState("");
  const [games, setGames] = useState<RemoteGame[]>([]),
    [loading, setLoading] = useState(false),
    [error, setError] = useState("");
  const file = useRef<HTMLInputElement>(null);
  const message = (key: string) =>
    key === "rate"
      ? t(
          "Zu viele Anfragen. Bitte warte mindestens eine Minute.",
          "Too many requests. Please wait at least one minute.",
        )
      : key === "profile"
        ? t(
            "Profil nicht gefunden. Prüfe den Benutzernamen.",
            "Profile not found. Check the username.",
          )
        : key === "empty"
          ? t("Die PGN enthält keine Züge.", "The PGN contains no moves.")
          : key === "long"
            ? t(
                "Diese Partie ist zu lang (maximal 1200 Halbzüge).",
                "This game is too long (maximum 1200 plies).",
              )
            : t(
                "Das hat nicht geklappt. Prüfe deine Eingabe oder Verbindung und versuche es erneut.",
                "Something went wrong. Check your input or connection and try again.",
              );

  function load(text: string) {
    try {
      onLoad(parseGame(text));
    } catch (e) {
      setError(message(e instanceof Error ? e.message : ""));
    }
  }
  async function search() {
    setError("");
    setLoading(true);
    setGames([]);
    try {
      const result = await fetchGames(platform, username.trim());
      setGames(result);
      if (!result.length)
        setError(
          t(
            "Keine abgeschlossenen Standardpartien gefunden.",
            "No finished standard games found.",
          ),
        );
    } catch (e) {
      setError(message(e instanceof Error ? e.message : ""));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="import-backdrop">
      <section
        role="dialog"
        aria-modal="true"
        className="import-panel"
        aria-label={t("Partie importieren", "Import game")}
      >
        <div className="import-heading">
          <img src={`${import.meta.env.BASE_URL}icon.svg`} alt="" />
          <button
            className="language"
            onClick={() => setLang(lang === "de" ? "en" : "de")}
          >
            {lang.toUpperCase()} / {lang === "de" ? "EN" : "DE"}
          </button>
          {canClose && (
            <button
              aria-label={t("Schließen", "Close")}
              onClick={() => onClose()}
            >
              <X size={20} />
            </button>
          )}
        </div>
        <h2>
          {t(
            "Jede Partie hat einen Aha-Moment.",
            "Every game has an aha moment.",
          )}
        </h2>
        <p className="import-intro">
          {t(
            "Finde deinen. Importiere deine Partie – dein Coach und Stockfish übernehmen den Rest.",
            "Find yours. Import your game — your coach and Stockfish will take it from there.",
          )}
        </p>
        <div className="import-tabs">
          <button
            className={mode === "profile" ? "active" : ""}
            onClick={() => {
              setMode("profile");
              setError("");
            }}
          >
            <Search size={16} />
            {t("Über Benutzername", "By username")}
          </button>
          <button
            className={mode === "pgn" ? "active" : ""}
            onClick={() => {
              setMode("pgn");
              setError("");
            }}
          >
            <Upload size={16} />
            {t("PGN importieren", "Import PGN")}
          </button>
        </div>
        {mode === "profile" ? (
          <>
            <div className="platforms">
              <button
                className={platform === "chesscom" ? "active" : ""}
                onClick={() => {
                  setPlatform("chesscom");
                  setGames([]);
                }}
              >
                <span className="platform-dot chesscom" />
                Chess.com{platform === "chesscom" && <Check size={15} />}
              </button>
              <button
                className={platform === "lichess" ? "active" : ""}
                onClick={() => {
                  setPlatform("lichess");
                  setGames([]);
                }}
              >
                <span className="platform-dot lichess" />
                Lichess{platform === "lichess" && <Check size={15} />}
              </button>
            </div>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                search();
              }}
            >
              <label htmlFor="username">
                {t("Öffentlicher Benutzername", "Public username")}
              </label>
              <div className="search-field">
                <input
                  id="username"
                  autoComplete="off"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder={
                    platform === "chesscom" ? "kaanChesssyy" : "DrNykterstein"
                  }
                  required
                />
                <button
                  className="primary"
                  aria-label={t("Partien laden", "Load games")}
                  disabled={loading || !username.trim()}
                >
                  {loading ? (
                    <LoaderCircle className="spin" size={18} />
                  ) : (
                    <ArrowRight size={18} />
                  )}
                  <span>{t("Partien laden", "Load games")}</span>
                </button>
              </div>
            </form>
            <p className="import-hint">
              {t(
                "Bis zu 20 abgeschlossene Partien. Kein Login nötig.",
                "Up to 20 finished games. No login required.",
              )}
            </p>
            {games.length > 0 && (
              <div className="remote-games">
                {games.map((g, i) => (
                  <button key={i} onClick={() => load(g.pgn)}>
                    <div>
                      <strong>
                        {g.white} <span>vs.</span> {g.black}
                      </strong>
                      <small>
                        {g.date} · {g.result}
                      </small>
                    </div>
                    <ArrowRight size={17} />
                  </button>
                ))}
              </div>
            )}
          </>
        ) : (
          <>
            <label htmlFor="pgn">
              {t("Deine Partie als PGN", "Your game as PGN")}
            </label>
            <textarea
              id="pgn"
              value={pgn}
              onChange={(e) => setPgn(e.target.value)}
              placeholder={
                '[White "You"]\n[Black "Opponent"]\n\n1. e4 e5 2. Nf3 Nc6 ...'
              }
            />
            <div className="pgn-actions">
              <input
                type="file"
                accept=".pgn,.txt"
                hidden
                ref={file}
                onChange={async (e) => {
                  const f = e.target.files?.[0];
                  if (f) {
                    if (f.size > 2000000) {
                      setError(
                        t(
                          "Die Datei ist zu groß (max. 2 MB).",
                          "File too large (max. 2 MB).",
                        ),
                      );
                      return;
                    }
                    setPgn(await f.text());
                  }
                  e.target.value = "";
                }}
              />
              <button
                className="secondary"
                onClick={() => file.current?.click()}
              >
                <Upload size={16} />
                {t("Datei öffnen", "Open file")}
              </button>
              <button
                className="primary"
                disabled={!pgn.trim()}
                onClick={() => {
                  const list = splitPgn(pgn);
                  if (list.length === 1) load(list[0]);
                  else {
                    try {
                      setGames(
                        list.map((item) => {
                          const parsed = parseGame(item);
                          return {
                            pgn: item,
                            white: parsed.headers.White || "White",
                            black: parsed.headers.Black || "Black",
                            result: parsed.headers.Result || "*",
                            date: parsed.headers.Date || "",
                          };
                        }),
                      );
                    } catch {
                      setError(message(""));
                    }
                  }
                }}
              >
                {t("Partie öffnen", "Open game")}
                <ArrowRight size={16} />
              </button>
            </div>
            {games.length > 0 && (
              <div className="remote-games">
                {games.map((g, i) => (
                  <button key={i} onClick={() => load(g.pgn)}>
                    {g.white} – {g.black}
                    <ArrowRight size={16} />
                  </button>
                ))}
              </div>
            )}
          </>
        )}
        {error && (
          <p className="error" role="alert">
            {error}
          </p>
        )}
        <div className="import-bottom">
          <span className="status-dot" />
          {t(
            "Lokal analysiert. Ohne Abo. Ohne Konto.",
            "Local analysis. No subscription. No account.",
          )}
        </div>
      </section>
    </div>
  );
}
