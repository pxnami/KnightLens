import { mkdir, copyFile } from "node:fs/promises";
await mkdir("public/engine", { recursive: true });
for (const variant of ["lite-single", "single"]) {
  for (const ext of ["js", "wasm"])
    await copyFile(
      `node_modules/stockfish/bin/stockfish-18-${variant}.${ext}`,
      `public/engine/stockfish-18-${variant}.${ext}`,
    );
}
