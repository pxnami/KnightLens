import type { Position } from "./chess";
import { parseInfo, finishSearch, type UciInfo } from "./uci";
export type SearchOptions = {
  initialFen?: string;
  moves?: string[];
  searchMoves?: string[];
};
export class Engine {
  private worker: Worker;
  private disposed = false;
  private pending?: {
    line: (line: string) => void;
    reject: (error: Error) => void;
    timer: ReturnType<typeof setTimeout>;
  };
  constructor(full = true) {
    this.worker = new Worker(
      `${import.meta.env.BASE_URL}engine/stockfish-18-${full ? "single" : "lite-single"}.js`,
    );
    this.worker.onmessage = (event) => {
      for (const line of String(event.data).split(/\r?\n/))
        this.pending?.line(line.trim());
    };
    this.worker.onerror = () =>
      this.stop(new Error("Stockfish worker failed to load or crashed"));
  }
  async init() {
    await this.exchange(
      ["uci"],
      (line) => (line === "uciok" ? true : undefined),
      120000,
    );
    await this.exchange(
      [
        "setoption name Hash value 64",
        "setoption name MultiPV value 2",
        "ucinewgame",
        "isready",
      ],
      (line) => (line === "readyok" ? true : undefined),
      120000,
    );
  }
  private exchange<T>(
    commands: string[],
    parse: (line: string) => T | undefined,
    timeout: number,
  ): Promise<T> {
    if (this.disposed) return Promise.reject(new Error("cancelled"));
    if (this.pending)
      return Promise.reject(new Error("Stockfish search already in progress"));
    return new Promise<T>((resolve, reject) => {
      const complete = (error?: Error, value?: T) => {
        if (!this.pending) return;
        clearTimeout(this.pending.timer);
        this.pending = undefined;
        if (error) reject(error);
        else resolve(value as T);
      };
      const timer = setTimeout(
        () => this.stop(new Error("Stockfish did not respond in time")),
        timeout,
      );
      this.pending = {
        timer,
        reject: (error) => complete(error),
        line: (line) => {
          try {
            const result = parse(line);
            if (result !== undefined) complete(undefined, result);
          } catch (error) {
            complete(error instanceof Error ? error : new Error(String(error)));
          }
        },
      };
      for (const command of commands) this.worker.postMessage(command);
    });
  }
  evaluate(
    fen: string,
    depth: number,
    options: SearchOptions = {},
  ): Promise<Position> {
    const sign = fen.split(" ")[1] === "w" ? 1 : -1;
    const lines: UciInfo[] = [];
    const position = options.initialFen
      ? `position fen ${options.initialFen}${options.moves?.length ? ` moves ${options.moves.join(" ")}` : ""}`
      : `position fen ${fen}`;
    const search = `go depth ${depth}${options.searchMoves?.length ? ` searchmoves ${options.searchMoves.join(" ")}` : ""}`;
    return this.exchange(
      [position, search],
      (line) => {
        const info = parseInfo(line, sign);
        if (info) lines.push(info);
        if (line.startsWith("bestmove "))
          return finishSearch(lines, line.split(/\s+/)[1], fen);
      },
      90000,
    );
  }
  stop(reason = new Error("cancelled")) {
    if (this.disposed) return;
    this.disposed = true;
    this.pending?.reject(reason);
    this.worker.terminate();
  }
}
