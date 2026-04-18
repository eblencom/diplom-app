import fs from "node:fs";
import path from "node:path";

/**
 * Root of the Next app (folder with next.config.*), even if `process.cwd()` is a parent directory.
 */
export function getProjectRoot(): string {
  let current = path.resolve(process.cwd());

  for (let i = 0; i < 12; i += 1) {
    const candidates = ["next.config.ts", "next.config.js", "next.config.mjs", "next.config.cjs"];
    if (candidates.some((name) => fs.existsSync(path.join(current, name)))) {
      return current;
    }

    const parent = path.dirname(current);
    if (parent === current) {
      break;
    }
    current = parent;
  }

  return path.resolve(process.cwd());
}
