import { useEffect, useRef, useState } from "react";
import { ArrowRight, Check, LoaderCircle } from "lucide-react";
import {
  fetchGamePage,
  resolveProfile,
  ImportError,
  type Platform,
  type GameCursor,
  type RemoteGame,
} from "./api";
import type { Lang } from "./chess";
type Profile = { platform: Platform; username: string };
function rememberedProfile(): Profile {
  try {
    const saved = JSON.parse(
      sessionStorage.getItem("knightlens-profile") || "null",
    );
    if (
      saved &&
      (saved.platform === "chesscom" || saved.platform === "lichess") &&
      typeof saved.username === "string"
    )
      return saved;
  } catch {}
  return { platform: "chesscom", username: "" };
}
export function ProfileImport({
  lang,
  onLoad,
}: {
  lang: Lang;
  onLoad: (pgn: string) => void;
}) {
  const t = (de: string, en: string) => (lang === "de" ? de : en);
  const [remembered] = useState(rememberedProfile);
  const [platform, setPlatform] = useState<Platform>(remembered.platform),
    [username, setUsername] = useState(remembered.username);
  const [games, setGames] = useState<RemoteGame[]>([]),
    [cursor, setCursor] = useState<GameCursor>(),
    [profile, setProfile] = useState<Profile>();
  const [loading, setLoading] = useState(false),
    [error, setError] = useState(""),
    [progress, setProgress] = useState("");
  const controller = useRef<AbortController | null>(null),
    sequence = useRef(0);
  useEffect(
    () => () => {
      sequence.current++;
      controller.current?.abort();
    },
    [],
  );
  function cancel() {
    sequence.current++;
    controller.current?.abort();
    setLoading(false);
    setProgress("");
  }
  function clear() {
    cancel();
    setGames([]);
    setCursor(undefined);
    setProfile(undefined);
    setError("");
  }
  function errorMessage(error: unknown) {
    if (error instanceof ImportError) {
      if (error.code === "profile")
        return t(
          "Dieses Profil wurde auf der gewählten Plattform nicht gefunden.",
          "This profile was not found on the selected platform.",
        );
      if (error.code === "invalid")
        return t(
          "Bitte gib einen Benutzernamen oder einen vollständigen Profil-Link ein.",
          "Enter a username or a full profile link.",
        );
      if (error.code === "rate")
        return (
          t(
            "Die Plattform begrenzt Anfragen. Erneut versuchen ab ",
            "The platform is limiting requests. Try again after ",
          ) +
          new Date(error.retryAt || Date.now() + 60000).toLocaleTimeString(
            lang === "de" ? "de-DE" : "en-GB",
            { hour: "2-digit", minute: "2-digit", second: "2-digit" },
          )
        );
      if (error.code === "timeout")
        return t(
          "Die Plattform antwortet zu langsam. Deine bereits geladenen Partien bleiben erhalten. Bitte versuche es erneut.",
          "The platform took too long to respond. Your loaded games are preserved. Please try again.",
        );
    }
    return t(
      "Partien konnten nicht geladen werden. Prüfe deine Verbindung und versuche es erneut; alternativ kannst du eine PGN öffnen.",
      "Games could not be loaded. Check your connection and try again, or import a PGN.",
    );
  }
  async function search(more = false) {
    controller.current?.abort();
    const request = new AbortController();
    controller.current = request;
    const id = ++sequence.current;
    setLoading(true);
    setError("");
    setProgress("");
    try {
      const selected =
        more && profile ? profile : resolveProfile(username, platform);
      setPlatform(selected.platform);
      const page = await fetchGamePage(selected.platform, selected.username, {
        signal: request.signal,
        cursor: more ? cursor : undefined,
        onProgress: (scanned, total) => {
          if (sequence.current === id)
            setProgress(t("Archive", "Archives") + ` ${scanned}/${total}`);
        },
      });
      if (sequence.current !== id || request.signal.aborted) return;
      setGames((previous) => {
        const combined = more ? [...previous, ...page.games] : page.games;
        const seen = new Set<string>();
        return combined.filter((game) => {
          const key = game.id || game.url || game.pgn;
          if (seen.has(key)) return false;
          seen.add(key);
          return true;
        });
      });
      setCursor(page.next);
      setProfile(selected);
      setProgress("");
      try {
        sessionStorage.setItem("knightlens-profile", JSON.stringify(selected));
      } catch {}
    } catch (error) {
      if (sequence.current === id && !request.signal.aborted)
        setError(errorMessage(error));
    } finally {
      if (sequence.current === id) setLoading(false);
    }
  }
  return (
    <>
      <div className="platforms">
        {(["chesscom", "lichess"] as const).map((value) => (
          <button
            key={value}
            className={platform === value ? "active" : ""}
            onClick={() => {
              clear();
              setPlatform(value);
            }}
            aria-pressed={platform === value}
          >
            <span className={`platform-dot ${value}`} />
            {value === "chesscom" ? "Chess.com" : "Lichess"}
            {platform === value && <Check size={15} />}
          </button>
        ))}
      </div>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          search();
        }}
      >
        <label htmlFor="username">
          {t("Benutzername oder Profil-Link", "Username or profile link")}
        </label>
        <div className="search-field">
          <input
            id="username"
            autoComplete="off"
            value={username}
            onChange={(event) => {
              clear();
              setUsername(event.target.value);
            }}
            placeholder={
              platform === "chesscom"
                ? "Benutzername / chess.com/member/…"
                : "Benutzername / lichess.org/@/…"
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
          "Abgeschlossene Standardpartien. Ältere Partien kannst du nachladen.",
          "Finished standard games. Older games can be loaded below.",
        )}
      </p>
      {loading && (
        <div className="import-loading" role="status">
          <span>
            {progress || t("Partien werden geladen …", "Loading games …")}
          </span>
          <button onClick={cancel}>{t("Abbrechen", "Cancel")}</button>
        </div>
      )}
      {profile && (
        <p className="profile-result" role="status">
          <strong>
            {profile.platform === "chesscom" ? "Chess.com" : "Lichess"} ·{" "}
            {profile.username}
          </strong>
          <span>
            {games.length} {t("Partien geladen", "games loaded")}
          </span>
        </p>
      )}
      {profile && !games.length && !loading && !error && (
        <p className="import-hint">
          {t(
            "Keine abgeschlossenen Standardpartien in diesem öffentlichen Profil gefunden. Bot- und private Partien gegebenenfalls als PGN importieren.",
            "No finished standard games found in this public profile. Import bot or private games as PGN if needed.",
          )}
        </p>
      )}
      {games.length > 0 && (
        <div className="remote-games">
          {games.map((game, index) => (
            <button
              key={game.id || game.url || index}
              onClick={() => onLoad(game.pgn)}
            >
              <div>
                <strong>
                  {game.white} <span>vs.</span> {game.black}
                </strong>
                <small>
                  {new Date(game.date).toLocaleString(
                    lang === "de" ? "de-DE" : "en-GB",
                    { dateStyle: "short", timeStyle: "short" },
                  )}{" "}
                  · {game.timeClass} · {game.result}
                </small>
              </div>
              <ArrowRight size={17} />
            </button>
          ))}
        </div>
      )}
      {cursor && (
        <button
          className="secondary load-older"
          disabled={loading}
          onClick={() => search(true)}
        >
          {t("Ältere Partien laden", "Load older games")}
        </button>
      )}
      {profile && !cursor && games.length > 0 && !loading && (
        <p className="import-hint">
          {t(
            "Alle verfügbaren Standardpartien geladen.",
            "All available standard games loaded.",
          )}
        </p>
      )}
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
    </>
  );
}
