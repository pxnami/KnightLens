import { ImportDialog } from "./ImportDialog";
import { EvaluationGraph } from "./EvaluationGraph";
import { Overview } from "./Overview";
import { MoveList } from "./MoveList";
import { useEffect, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import { Chess, type Square } from "chess.js";
import {
  ArrowRight,
  ChevronFirst,
  ChevronLast,
  ChevronLeft,
  ChevronRight,
  Play,
  Pause,
  RotateCw,
  Download,
  Plus,
  BookOpen,
  ChartNoAxesCombined,
  Lightbulb,
  X,
  ExternalLink,
  GraduationCap,
} from "lucide-react";
import "@fontsource/dm-sans/400.css";
import "@fontsource/dm-sans/500.css";
import "@fontsource/dm-sans/600.css";
import "@fontsource/dm-sans/700.css";
import {
  classify,
  coach,
  lineSan,
  labels,
  type Game,
  type Lang,
  type Review,
  type Position,
} from "./chess";
import { Engine } from "./engine";

import "./style.css";

function App() {
  const [lang, setLang] = useState<Lang>(() => {
    try {
      return localStorage.getItem("knightlens-language") === "en" ? "en" : "de";
    } catch {
      return "de";
    }
  });
  const t = (de: string, en: string) => (lang === "de" ? de : en);
  const [game, setGame] = useState<Game>();
  const [ply, setPly] = useState(0),
    [flipped, setFlipped] = useState(false),
    [playing, setPlaying] = useState(false);
  const [importing, setImporting] = useState(true),
    [error, setError] = useState("");
  const [reviews, setReviews] = useState<Review[]>([]),
    [positions, setPositions] = useState<Position[]>([]),
    [busy, setBusy] = useState(false),
    [depth, setDepth] = useState(14),
    [progress, setProgress] = useState(0);
  const [fullEngine, setFullEngine] = useState(false);
  const [tab, setTab] = useState("moves"),
    [explaining, setExplaining] = useState(false),
    [showBest, setShowBest] = useState(false),
    [variation, setVariation] = useState<{ fen: string; san: string }>();
  const [selected, setSelected] = useState<Square>();
  const engine = useRef<Engine | null>(null),
    run = useRef(0);
  const fen = variation?.fen || game?.fens[ply] || new Chess().fen();
  const board = new Chess(fen),
    move = game?.moves[ply - 1],
    review = reviews[ply - 1],
    position = positions[ply];
  const score =
    !variation && position
      ? position.mate !== undefined
        ? `M${Math.abs(position.mate)}`
        : `${position.cp >= 0 ? "+" : ""}${(position.cp / 100).toFixed(2)}`
      : "—";
  const changePly = (next: number) => {
    setPly(Math.max(0, Math.min(game?.moves.length || 0, next)));
    setVariation(undefined);
    setSelected(undefined);
    setExplaining(false);
  };
  function cancel() {
    run.current++;
    engine.current?.stop();
    engine.current = null;
    setBusy(false);
  }
  useEffect(
    () => () => {
      engine.current?.stop();
    },
    [],
  );
  useEffect(() => {
    document.documentElement.lang = lang;
    try {
      localStorage.setItem("knightlens-language", lang);
    } catch {
      /* Preference storage is optional. */
    }
  }, [lang]);
  useEffect(() => {
    if (!playing) return;
    const id = setInterval(
      () =>
        setPly((p) => {
          if (p >= (game?.moves.length || 0)) {
            setPlaying(false);
            return p;
          }
          return p + 1;
        }),
      900,
    );
    return () => clearInterval(id);
  }, [playing, game]);
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (
        (e.target as HTMLElement).closest("input,textarea,select") ||
        importing
      )
        return;
      if (e.key === "ArrowRight") {
        e.preventDefault();
        changePly(ply + 1);
      }
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        changePly(ply - 1);
      }
      if (e.key === "Home") changePly(0);
      if (e.key === "End") changePly(game?.moves.length || 0);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [ply, game, importing]);
  useEffect(() => {
    const active = document.querySelector<HTMLElement>(".move.active");
    const table = active?.closest<HTMLElement>(".move-table");
    if (active && table) {
      const a = active.getBoundingClientRect(),
        b = table.getBoundingClientRect();
      if (a.bottom > b.bottom) table.scrollTop += a.bottom - b.bottom;
      if (a.top < b.top + 30) table.scrollTop -= b.top + 30 - a.top;
    }
  }, [ply]);
  function load(parsed: Game) {
    cancel();
    setGame(parsed);
    setPly(0);
    setReviews([]);
    setPositions([]);
    setProgress(0);
    setImporting(false);
    setPlaying(false);
    setVariation(undefined);
    setError("");
  }
  async function analyze() {
    if (!game) return;
    cancel();
    const id = run.current;
    const worker = new Engine(fullEngine);
    engine.current = worker;
    setBusy(true);
    setError("");
    setReviews([]);
    setPositions([]);
    setProgress(0);
    setTab("moves");
    try {
      await worker.init();
      const evaluations: Position[] = [],
        results: Review[] = [];
      for (let i = 0; i < game.fens.length; i++) {
        const chess = new Chess(game.fens[i]);
        const result: Position = chess.isGameOver()
          ? {
              cp: chess.isCheckmate()
                ? chess.turn() === "w"
                  ? -10000
                  : 10000
                : 0,
              mate: chess.isCheckmate() ? 0 : undefined,
              best: "",
              pv: [],
              depth,
            }
          : await worker.evaluate(game.fens[i], depth);
        if (run.current !== id) return;
        evaluations.push(result);
        setPositions([...evaluations]);
        if (i) {
          results.push(classify(game, i - 1, evaluations[i - 1], result));
          setReviews([...results]);
        }
        setProgress(i / game.moves.length);
      }
      if (run.current === id) {
        setTab("overview");
        setBusy(false);
        worker.stop();
        engine.current = null;
      }
    } catch (e) {
      if (run.current === id) {
        setError(
          t(
            "Stockfish konnte die Analyse nicht abschließen. Du kannst sie erneut starten.",
            "Stockfish could not finish the analysis. You can restart it.",
          ),
        );
        setBusy(false);
        worker.stop();
        engine.current = null;
      }
    }
  }
  const white = game?.headers.White || t("Weiß", "White"),
    black = game?.headers.Black || t("Schwarz", "Black");
  const accuracy = (color: string) => {
    const rs = reviews.filter((_, i) => game?.moves[i].color === color);
    return rs.length
      ? (rs.reduce((s, r) => s + r.accuracy, 0) / rs.length).toFixed(1)
      : "—";
  };
  const badge = (r: Review) => {
    const l = labels[r.category];
    return (
      <span
        className="badge"
        style={{ color: l[3] }}
        title={l[lang === "de" ? 0 : 1]}
      >
        {l[2]}
      </span>
    );
  };
  function download() {
    if (!game) return;
    const url = URL.createObjectURL(
      new Blob([game.pgn], { type: "application/x-chess-pgn" }),
    );
    const a = document.createElement("a");
    a.href = url;
    a.download = "knightlens.pgn";
    a.click();
    URL.revokeObjectURL(url);
  }
  function squareClick(square: Square) {
    if (!game) return;
    if (selected) {
      try {
        const candidate = new Chess(fen);
        const m = candidate.move({
          from: selected,
          to: square,
          promotion: "q",
        });
        setVariation({ fen: candidate.fen(), san: m.san });
        setSelected(undefined);
        setPlaying(false);
        return;
      } catch {
        setSelected(undefined);
      }
    }
    if (board.get(square)?.color === board.turn()) setSelected(square);
  }
  const squares = Array.from(
    { length: 64 },
    (_, i) =>
      `${"abcdefgh"[flipped ? 7 - (i % 8) : i % 8]}${flipped ? 1 + Math.floor(i / 8) : 8 - Math.floor(i / 8)}` as Square,
  );
  const arrow =
    showBest && positions[ply]?.best && !variation
      ? positions[ply].best
      : undefined;
  const center = (square: string) => {
    const i = squares.indexOf(square as Square);
    return [(i % 8) * 12.5 + 6.25, Math.floor(i / 8) * 12.5 + 6.25];
  };
  const arrowFrom = arrow ? center(arrow.slice(0, 2)) : [],
    arrowTo = arrow ? center(arrow.slice(2, 4)) : [];
  const legal = selected
    ? board.moves({ square: selected, verbose: true }).map((m) => m.to)
    : [];
  const player = (name: string, color: string) => (
    <div className="player">
      <div className={`player-piece ${color}`}>
        <img src={`${import.meta.env.BASE_URL}pieces/${color}k.svg`} alt="" />
      </div>
      <div>
        <strong>{name}</strong>
        <small>
          {color === "w" ? t("Weiß", "White") : t("Schwarz", "Black")}
          {game?.headers[color === "w" ? "WhiteElo" : "BlackElo"]
            ? ` · ${game.headers[color === "w" ? "WhiteElo" : "BlackElo"]}`
            : ""}
        </small>
      </div>
      <span className="player-result">{game?.headers.Result || "—"}</span>
    </div>
  );
  return (
    <>
      <header>
        <a className="brand" href={import.meta.env.BASE_URL}>
          <img src={`${import.meta.env.BASE_URL}icon.svg`} alt="" />
          <span>
            Knight<span className="muted-brand">Lens</span>
          </span>
        </a>
        <div className="header-center">
          <span className="status-dot" />
          {t("Dein nächster besserer Zug.", "Your next better move.")}
        </div>
        <div className="header-actions">
          <button
            className="language"
            onClick={() => setLang(lang === "de" ? "en" : "de")}
            aria-label="Change language"
          >
            {lang === "de" ? "DE" : "EN"}
            <span> / {lang === "de" ? "EN" : "DE"}</span>
          </button>
          <a
            href="https://github.com/pxnami/KnightLens"
            target="_blank"
            rel="noreferrer"
            aria-label="GitHub"
          >
            <ExternalLink size={18} />
          </a>
        </div>
      </header>
      <main>
        <div className="page-heading">
          <div>
            <h1>
              {t(
                "Partie verstehen. Besser spielen.",
                "Understand your game. Play better.",
              )}
            </h1>
            <p>
              {t(
                "Jeder Zug erzählt etwas. Finde heraus, was.",
                "Every move tells a story. Find yours.",
              )}
            </p>
          </div>
          <button
            className="secondary"
            onClick={() => {
              setImporting(true);
              setError("");
            }}
          >
            <Plus size={17} />
            {t("Partie importieren", "Import game")}
          </button>
        </div>
        <div className="workspace">
          <section
            className="board-column"
            aria-label={t("Schachbrett", "Chessboard")}
          >
            {player(flipped ? white : black, flipped ? "w" : "b")}
            <div className="board-frame">
              <div
                className="eval-bar"
                title={t(
                  "Bewertung aus Sicht von Weiß",
                  "Evaluation from White’s perspective",
                )}
              >
                <div
                  className="eval-white"
                  style={{
                    height: `${position ? 100 / (1 + Math.exp(-position.cp / 400)) : 50}%`,
                  }}
                />
                <span>{score}</span>
              </div>
              <div className="board">
                {squares.map((sq, i) => {
                  const piece = board.get(sq);
                  return (
                    <button
                      key={sq}
                      className={`square ${(Number(sq[1]) + sq.charCodeAt(0)) % 2 === 0 ? "dark" : "light"} ${move && (move.from === sq || move.to === sq) && !variation ? "last" : ""} ${selected === sq ? "selected" : ""}`}
                      onClick={() => squareClick(sq)}
                      aria-label={`${sq}${piece ? " " + piece.color + piece.type : ""}`}
                    >
                      <span className="rank">{i % 8 === 0 ? sq[1] : ""}</span>
                      <span className="file">{i >= 56 ? sq[0] : ""}</span>
                      {piece && (
                        <img
                          draggable={false}
                          src={`${import.meta.env.BASE_URL}pieces/${piece.color}${piece.type}.svg`}
                          alt={`${piece.color}${piece.type}`}
                        />
                      )}{" "}
                      {legal.includes(sq) && <span className="legal-dot" />}
                      {move?.to === sq && review && !variation && (
                        <span
                          className="board-badge"
                          style={{ background: labels[review.category][3] }}
                        >
                          {labels[review.category][2]}
                        </span>
                      )}
                    </button>
                  );
                })}
                {arrow && (
                  <svg className="arrows" viewBox="0 0 100 100">
                    <defs>
                      <marker
                        id="arrowhead"
                        markerWidth="4"
                        markerHeight="4"
                        refX="2"
                        refY="2"
                        orient="auto"
                      >
                        <path d="M0 0 L4 2 L0 4z" fill="#e5ba58" />
                      </marker>
                    </defs>
                    <line
                      x1={arrowFrom[0]}
                      y1={arrowFrom[1]}
                      x2={arrowTo[0]}
                      y2={arrowTo[1]}
                      stroke="#e5ba58"
                      strokeWidth="1.5"
                      markerEnd="url(#arrowhead)"
                      opacity=".85"
                    />
                  </svg>
                )}
                {!game && (
                  <div className="board-empty">
                    <BookOpen size={28} />
                    <strong>
                      {t(
                        "Deine Partie beginnt hier.",
                        "Your game starts here.",
                      )}
                    </strong>
                    <span>
                      {t(
                        "Importiere eine Partie für deine Analyse.",
                        "Import a game to start your review.",
                      )}
                    </span>
                  </div>
                )}
              </div>
            </div>
            {player(flipped ? black : white, flipped ? "b" : "w")}
            <div className="board-toolbar">
              <button
                onClick={() => setFlipped(!flipped)}
                title={t("Brett drehen", "Flip board")}
              >
                <RotateCw size={17} />
              </button>
              <span>
                {variation
                  ? t("Variante", "Variation") + ": " + variation.san
                  : `${ply} / ${game?.moves.length || 0} ${t("Halbzüge", "plies")}`}
              </span>
              {variation && (
                <button onClick={() => setVariation(undefined)}>
                  {t("Zurück zur Partie", "Back to game")}
                </button>
              )}
              <div className="playback">
                <button
                  disabled={!game || ply === 0}
                  onClick={() => changePly(0)}
                  aria-label={t("Anfang", "First")}
                >
                  <ChevronFirst size={19} />
                </button>
                <button
                  disabled={!game || ply === 0}
                  onClick={() => changePly(ply - 1)}
                  aria-label={t("Zurück", "Previous")}
                >
                  <ChevronLeft size={20} />
                </button>
                <button
                  disabled={!game}
                  className="play"
                  onClick={() => {
                    setVariation(undefined);
                    if (ply === game?.moves.length) setPly(0);
                    setPlaying(!playing);
                  }}
                  aria-label={playing ? "Pause" : "Play"}
                >
                  {playing ? <Pause size={18} /> : <Play size={18} />}
                </button>
                <button
                  disabled={!game || ply === game.moves.length}
                  onClick={() => changePly(ply + 1)}
                  aria-label={t("Weiter", "Next")}
                >
                  <ChevronRight size={20} />
                </button>
                <button
                  disabled={!game || ply === game.moves.length}
                  onClick={() => changePly(game?.moves.length || 0)}
                  aria-label={t("Ende", "Last")}
                >
                  <ChevronLast size={19} />
                </button>
              </div>
              <button
                disabled={!game}
                onClick={download}
                title={t("PGN herunterladen", "Download PGN")}
              >
                <Download size={17} />
              </button>
            </div>
            <div className="board-note">
              <span className="status-dot" />
              {t(
                "Analyse auf deinem Gerät. Deine PGN bleibt privat.",
                "On-device analysis. Your PGN stays private.",
              )}
              <span className="keyboard-hint">
                ← → {t("zum Navigieren", "to navigate")}
              </span>
            </div>
          </section>
          <aside className="analysis-panel">
            <div className="panel-heading">
              <h2>{t("Partieanalyse", "Game analysis")}</h2>
              <span className="engine-tag">
                Stockfish 18 <span>{fullEngine ? "NNUE" : "Lite"}</span>
              </span>
            </div>
            <div className="coach">
              <div className="coach-header">
                <div className="coach-icon">
                  <GraduationCap size={23} />
                </div>
                <div>
                  <strong>{t("Dein Coach", "Your coach")}</strong>
                  <small>
                    {t("Ein Zug. Eine Erkenntnis.", "One move. One insight.")}
                  </small>
                </div>
                {review && badge(review)}
              </div>
              <h3>
                {move
                  ? `${Math.ceil(ply / 2)}${move.color === "b" ? "..." : "."} ${move.san}`
                  : t("Schauen wir genauer hin.", "Let’s take a closer look.")}
              </h3>
              <p>
                {coach(
                  game || { moves: [], fens: [], headers: {}, pgn: "" },
                  ply - 1,
                  review,
                  lang,
                )}
              </p>
              {review && (
                <>
                  <button
                    className="text-button"
                    onClick={() => setExplaining(!explaining)}
                  >
                    <Lightbulb size={15} />
                    {explaining
                      ? t("Weniger anzeigen", "Show less")
                      : t("Fortsetzung erklären", "Explain continuation")}
                    <ArrowRight size={15} />
                  </button>
                  {explaining && (
                    <div className="explanation">
                      <strong>
                        {t(
                          "Beste Idee vor diesem Zug",
                          "Best idea before this move",
                        )}
                      </strong>
                      <p>{lineSan(move!.before, review.before.pv)}</p>
                      <span>
                        {t("Stockfish-Tiefe", "Stockfish depth")}{" "}
                        {review.before.depth} ·{" "}
                        {t(
                          "Bewertung nach dem Zug",
                          "Evaluation after the move",
                        )}
                        : {score}
                      </span>
                    </div>
                  )}
                </>
              )}
            </div>
            <label className="engine-choice">
              <input
                type="checkbox"
                checked={fullEngine}
                disabled={busy}
                onChange={(e) => setFullEngine(e.target.checked)}
              />
              {t(
                "Volle NNUE-Engine laden (113 MB)",
                "Load full NNUE engine (113 MB)",
              )}
            </label>
            <div className="analysis-controls">
              <label>
                {t("Analysetiefe", "Analysis depth")}
                <select
                  value={depth}
                  disabled={busy}
                  onChange={(e) => setDepth(Number(e.target.value))}
                >
                  <option value={12}>12 · {t("Schnell", "Quick")}</option>
                  <option value={14}>14 · {t("Standard", "Standard")}</option>
                  <option value={18}>18 · {t("Gründlich", "Deep")}</option>
                  <option value={22}>
                    22 · {t("Sehr gründlich", "Very deep")}
                  </option>
                </select>
              </label>
              <button
                className="primary analyze"
                disabled={!game}
                onClick={busy ? cancel : analyze}
              >
                {busy ? <X size={17} /> : <ChartNoAxesCombined size={17} />}{" "}
                {busy
                  ? t("Stoppen", "Stop")
                  : reviews.length
                    ? t("Neu analysieren", "Analyze again")
                    : t("Analyse starten", "Start analysis")}
              </button>
            </div>
            {busy && (
              <div className="progress" role="status">
                <div style={{ width: `${progress * 100}%` }} />
                <span>
                  {t("Analysiere", "Analyzing")} {reviews.length}/
                  {game?.moves.length} · {Math.round(progress * 100)}%
                </span>
              </div>
            )}
            {!importing && error && (
              <p className="error" role="alert">
                {error}
              </p>
            )}
            <div className="tabs">
              <button
                className={tab === "moves" ? "active" : ""}
                onClick={() => setTab("moves")}
              >
                <BookOpen size={16} />
                {t("Züge", "Moves")}
              </button>
              <button
                className={tab === "overview" ? "active" : ""}
                onClick={() => setTab("overview")}
              >
                <ChartNoAxesCombined size={16} />
                {t("Übersicht", "Overview")}
              </button>
            </div>
            {tab === "moves" ? (
              <MoveList
                t={t}
                game={game}
                ply={ply}
                reviews={reviews}
                positions={positions}
                badge={badge}
                changePly={changePly}
                setPlaying={setPlaying}
                showBest={showBest}
                setShowBest={setShowBest}
              />
            ) : (
              <Overview
                t={t}
                white={white}
                black={black}
                accuracy={accuracy}
                lang={lang}
                reviews={reviews}
                game={game}
                ply={ply}
                changePly={changePly}
                setTab={setTab}
              />
            )}
            <EvaluationGraph
              t={t}
              positions={positions}
              reviews={reviews}
              ply={ply}
              changePly={changePly}
            />
          </aside>
        </div>
        <footer>
          <span>
            KnightLens <span className="footer-dot">·</span>{" "}
            {t(
              "Schach verstehen, Zug für Zug.",
              "Chess, understood. Move by move.",
            )}
          </span>
          <span>
            {t("Unabhängiges Projekt", "Independent project")} ·{" "}
            <a
              href="https://github.com/nmrugg/stockfish.js/tree/v18.0.8"
              target="_blank"
              rel="noreferrer"
            >
              Stockfish.js · GPLv3
            </a>
          </span>
        </footer>
      </main>
      {importing && (
        <ImportDialog
          lang={lang}
          setLang={setLang}
          canClose={!!game}
          onClose={() => setImporting(false)}
          onLoad={load}
        />
      )}
    </>
  );
}
createRoot(document.getElementById("root")!).render(<App />);
