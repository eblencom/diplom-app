import "server-only";

import { spawn } from "node:child_process";

import { getProjectRoot } from "@/lib/project-root";

import type { PredictionKind } from "@/lib/predicts-types";

export async function runAlgosForNews(newsId: number): Promise<PredictionKind> {
  const pythonBin = process.env.PYTHON_BIN || "python";

  return new Promise((resolve, reject) => {
    const child = spawn(pythonBin, ["scripts/algos.py", String(newsId)], {
      cwd: getProjectRoot(),
      env: process.env,
      shell: false,
    });

    let stdout = "";
    let stderr = "";

    child.stdout?.on("data", (chunk) => {
      stdout += chunk.toString();
    });
    child.stderr?.on("data", (chunk) => {
      stderr += chunk.toString();
    });

    child.on("error", (error) => {
      reject(error);
    });

    child.on("close", (code) => {
      if (code !== 0) {
        reject(new Error(stderr.trim() || `algos exit ${code}`));
        return;
      }

      try {
        const payload = JSON.parse(stdout.trim()) as { prediction?: string };
        const p = payload.prediction;
        if (p === "positive" || p === "neutral" || p === "negative") {
          resolve(p);
          return;
        }
      } catch {
        reject(new Error("algos: invalid JSON"));
        return;
      }

      resolve("positive");
    });
  });
}
