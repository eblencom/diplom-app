import "server-only";

import { spawn } from "node:child_process";

import { closeExpectingPredicts } from "@/lib/predicts-processor";
import { getProjectRoot } from "@/lib/project-root";

declare global {
  var newsParserSchedulerStarted: boolean | undefined;
  var newsParserRunning: boolean | undefined;
  var newsPriceSyncRunning: boolean | undefined;
}

const PARSER_INTERVAL_MS = 60 * 1000;
/** Частое обновление котировок для открытых предсказаний (тяжелее парсер новостей). */
const PRICE_SYNC_INTERVAL_MS = 8 * 1000;
/** Закрытие предиктов сразу после появления обеих цен в БД. */
const PREDICTS_CHECK_INTERVAL_MS = 3 * 1000;

function runNewsParser() {
  if (global.newsParserRunning) {
    return;
  }

  global.newsParserRunning = true;
  const scriptPath = "scripts/news_parser.py";
  const pythonBin = process.env.PYTHON_BIN || "python";

  const child = spawn(pythonBin, [scriptPath], {
    cwd: getProjectRoot(),
    env: process.env,
    shell: false,
  });

  let stdout = "";
  let stderr = "";

  child.stdout.on("data", (chunk) => {
    stdout += chunk.toString();
  });

  child.stderr.on("data", (chunk) => {
    stderr += chunk.toString();
  });

  child.on("error", (error) => {
    console.error("[news-parser] failed to start:", error.message);
    global.newsParserRunning = false;
  });

  child.on("close", (code) => {
    if (code === 0) {
      const normalized = stdout.trim();
      console.log("[news-parser] completed:", normalized || "ok");
    } else {
      console.error("[news-parser] failed:", {
        code,
        stderr: stderr.trim(),
        stdout: stdout.trim(),
      });
    }

    global.newsParserRunning = false;
  });
}

function runNewsPriceSync() {
  if (global.newsPriceSyncRunning) {
    return;
  }

  global.newsPriceSyncRunning = true;
  const scriptPath = "scripts/news_prices_sync.py";
  const pythonBin = process.env.PYTHON_BIN || "python";

  const child = spawn(pythonBin, [scriptPath], {
    cwd: getProjectRoot(),
    env: process.env,
    shell: false,
  });

  let stdout = "";
  let stderr = "";

  child.stdout.on("data", (chunk) => {
    stdout += chunk.toString();
  });

  child.stderr.on("data", (chunk) => {
    stderr += chunk.toString();
  });

  child.on("error", (error) => {
    console.error("[news-prices-sync] failed to start:", error.message);
    global.newsPriceSyncRunning = false;
  });

  child.on("close", (code) => {
    if (code === 0) {
      const normalized = stdout.trim();
      console.log("[news-prices-sync] completed:", normalized || "ok");
      runPredictsCloser();
    } else {
      console.error("[news-prices-sync] failed:", {
        code,
        stderr: stderr.trim(),
        stdout: stdout.trim(),
      });
    }

    global.newsPriceSyncRunning = false;
  });
}

function runPredictsCloser() {
  void closeExpectingPredicts().catch((error: unknown) => {
    console.error("[predicts-closer]", error);
  });
}

export function startNewsParserScheduler() {
  if (global.newsParserSchedulerStarted) {
    return;
  }

  global.newsParserSchedulerStarted = true;
  global.newsParserRunning = false;
  global.newsPriceSyncRunning = false;

  runNewsParser();
  runNewsPriceSync();
  runPredictsCloser();
  setInterval(() => {
    runNewsParser();
  }, PARSER_INTERVAL_MS);
  setInterval(() => {
    runNewsPriceSync();
  }, PRICE_SYNC_INTERVAL_MS);
  setInterval(() => {
    runPredictsCloser();
  }, PREDICTS_CHECK_INTERVAL_MS);
}
