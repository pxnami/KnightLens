import { afterEach, expect, it, vi } from "vitest";
import { Chess } from "chess.js";
import { Engine } from "./engine";
class TestWorker {
  static instance: TestWorker;
  onmessage?: (event: { data: string }) => void;
  onerror?: () => void;
  commands: string[] = [];
  terminate = vi.fn();
  constructor() {
    TestWorker.instance = this;
  }
  postMessage(command: string) {
    this.commands.push(command);
  }
  emit(data: string) {
    this.onmessage?.({ data });
  }
}
afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});
it("initializes UCI, preserves history, and puts searchmoves last", async () => {
  vi.stubGlobal("Worker", TestWorker);
  const engine = new Engine();
  const worker = TestWorker.instance;
  const initialized = engine.init();
  worker.emit("uciok");
  await Promise.resolve();
  worker.emit("readyok");
  await initialized;
  const chess = new Chess();
  const initial = chess.fen();
  chess.move("e4");
  const result = engine.evaluate(chess.fen(), 16, {
    initialFen: initial,
    moves: ["e2e4"],
    searchMoves: ["e7e5"],
  });
  expect(worker.commands.at(-2)).toBe(`position fen ${initial} moves e2e4`);
  expect(worker.commands.at(-1)).toBe("go depth 16 searchmoves e7e5");
  worker.emit("info depth 16 score cp 30 pv e7e5 g1f3\nbestmove e7e5");
  expect((await result).cp).toBe(-30);
  engine.stop();
});
it("rejects cancellation immediately and clears the pending timeout", async () => {
  vi.useFakeTimers();
  vi.stubGlobal("Worker", TestWorker);
  const engine = new Engine();
  const pending = engine.init();
  const rejected = expect(pending).rejects.toThrow("cancelled");
  engine.stop();
  await rejected;
  expect(vi.getTimerCount()).toBe(0);
  expect(TestWorker.instance.terminate).toHaveBeenCalledTimes(1);
  engine.stop();
  expect(TestWorker.instance.terminate).toHaveBeenCalledTimes(1);
});
