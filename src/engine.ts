import type { Position } from "./chess";
export class Engine {
  private worker: Worker;
  private reject?: (reason: Error) => void;
  private disposed = false;
  constructor(full = false) {
    this.worker = new Worker(
      `${import.meta.env.BASE_URL}engine/stockfish-18-${full ? "single" : "lite-single"}.js`,
    );
  }
  async init() {
    await this.waitFor("uciok", "uci");
    this.worker.postMessage("setoption name Hash value 32");
    this.worker.postMessage("setoption name MultiPV value 2");
    await this.waitFor("readyok", "isready");
  }
  private waitFor(expected: string, command: string) {
    return new Promise<void>((resolve, reject) => {
      this.reject = reject;
      const timer = setTimeout(() => {
        this.stop();
        reject(new Error("Engine initialization timed out"));
      }, 45000);
      this.worker.onmessage = (e) => {
        if (String(e.data).includes(expected)) {
          clearTimeout(timer);
          this.reject = undefined;
          resolve();
        }
      };
      this.worker.onerror = () => {
        clearTimeout(timer);
        reject(new Error("Stockfish could not load"));
      };
      this.worker.postMessage(command);
    });
  }
  evaluate(fen: string, depth: number): Promise<Position> {
    if (this.disposed) return Promise.reject(new Error("cancelled"));
    const sign = fen.split(" ")[1] === "w" ? 1 : -1;
    return new Promise((resolve, reject) => {
      this.reject = reject;
      const scores = new Map<number, Position>();
      const timer = setTimeout(() => {
        this.stop();
        reject(new Error("Position analysis timed out"));
      }, 90000);
      this.worker.onerror = () => {
        clearTimeout(timer);
        reject(new Error("Stockfish worker failed"));
      };
      this.worker.onmessage = (e) => {
        const line = String(e.data);
        const score = line.match(/score (cp|mate) (-?\d+)/),
          pv = line.match(/ pv (.+)/),
          d = line.match(/depth (\d+)/),
          multi = line.match(/multipv (\d+)/);
        if (score && pv && d && !line.includes("bound")) {
          const value = Number(score[2]);
          scores.set(Number(multi?.[1] || 1), {
            cp:
              (score[1] === "mate"
                ? Math.sign(value) * (10000 - Math.abs(value))
                : value) * sign,
            mate: score[1] === "mate" ? value * sign : undefined,
            best: pv[1].split(" ")[0],
            pv: pv[1].split(" "),
            depth: Number(d[1]),
          });
        }
        if (line.startsWith("bestmove")) {
          clearTimeout(timer);
          this.reject = undefined;
          const result = scores.get(1);
          if (result) resolve({ ...result, second: scores.get(2)?.cp });
          else reject(new Error("Engine returned no evaluation"));
        }
      };
      this.worker.postMessage(`position fen ${fen}`);
      this.worker.postMessage(`go depth ${depth}`);
    });
  }
  stop() {
    this.disposed = true;
    this.worker.terminate();
    this.reject?.(new Error("cancelled"));
    this.reject = undefined;
  }
}
