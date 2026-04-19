/**
 * Telegram-бот: привязка чата командой `/start ЛОГИН_С_САЙТА` и рассылка цен MOEX (TQBR)
 * раз в минуту по тикерам из user_ticker_alerts.
 *
 * Требуется в .env (или окружении):
 *   DATABASE_URL=postgresql://...
 *   TELEGRAM_BOT_TOKEN=...   (от @BotFather)
 *
 * Запуск из каталога diplom-app:
 *   node scripts/tg_price_bot.cjs
 *   npm run tg-bot
 * Вместе с Next (dev): по умолчанию `npm run dev` поднимает и сайт, и бота
 * (см. package.json). Только сайт: `npm run dev:no-bot`.
 * Если нет TELEGRAM_BOT_TOKEN или DATABASE_URL — процесс сразу выходит с кодом 0,
 * чтобы не мешать `next dev`.
 *
 * Опционально в .env для ссылки на лендинге профиля:
 *   NEXT_PUBLIC_TELEGRAM_BOT_USERNAME=имя_бота_без_@
 */

/* eslint-disable no-console */
const fs = require("fs");
const path = require("path");
const { Pool } = require("pg");

function loadEnvFile() {
  const envPath = path.join(__dirname, "..", ".env");
  if (!fs.existsSync(envPath)) {
    return;
  }
  const text = fs.readFileSync(envPath, "utf8");
  for (const line of text.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) {
      continue;
    }
    const eq = trimmed.indexOf("=");
    if (eq === -1) {
      continue;
    }
    const key = trimmed.slice(0, eq).trim();
    let val = trimmed.slice(eq + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    if (process.env[key] === undefined) {
      process.env[key] = val;
    }
  }
}

loadEnvFile();

const DATABASE_URL = process.env.DATABASE_URL;
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;

if (!DATABASE_URL || !TELEGRAM_BOT_TOKEN) {
  console.warn(
    "[tg-bot] Не заданы DATABASE_URL или TELEGRAM_BOT_TOKEN — бот не запускается. " +
      "Добавьте их в .env или используйте npm run dev:no-bot (только Next.js).",
  );
  process.exit(0);
}

const pool = new Pool({ connectionString: DATABASE_URL });
const api = (method, body) =>
  fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/${method}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });

async function sendMessage(chatId, text) {
  const r = await api("sendMessage", {
    chat_id: chatId,
    text,
    disable_web_page_preview: true,
  });
  if (!r.ok) {
    const err = await r.text();
    console.error("sendMessage failed", r.status, err);
  }
}

async function fetchMoexLast(ticker) {
  const upper = String(ticker).trim().toUpperCase();
  const url = `https://iss.moex.com/iss/engines/stock/markets/shares/boards/TQBR/securities/${encodeURIComponent(upper)}.json?iss.meta=off`;
  const res = await fetch(url, { headers: { "User-Agent": "DiplomApp-TgBot/1.0" } });
  if (!res.ok) {
    return null;
  }
  const j = await res.json();
  const md = j.marketdata;
  if (!md?.columns || !md.data?.[0]) {
    return null;
  }
  const cols = md.columns;
  const row = md.data[0];
  const pick = (name) => {
    const i = cols.indexOf(name);
    if (i === -1) {
      return null;
    }
    const v = row[i];
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  };
  return pick("LAST") ?? pick("LCURRENTPRICE") ?? pick("PREVPRICE");
}

let updateOffset = 0;

async function handleUpdates() {
  const res = await fetch(
    `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/getUpdates?offset=${updateOffset}&timeout=25`,
  );
  if (!res.ok) {
    return;
  }
  const data = await res.json();
  if (!data.ok || !Array.isArray(data.result)) {
    return;
  }
  for (const u of data.result) {
    updateOffset = u.update_id + 1;
    const msg = u.message;
    if (!msg?.text || !msg.chat?.id) {
      continue;
    }
    const text = String(msg.text).trim();
    const parts = text.split(/\s+/);
    if (parts[0] === "/start" && parts[1]) {
      const login = parts[1].trim();
      const r = await pool.query(
        `UPDATE users SET tg_chat_id = $1 WHERE login = $2 RETURNING id, login`,
        [msg.chat.id, login],
      );
      if (r.rowCount === 1) {
        await sendMessage(
          msg.chat.id,
          `Чат привязан к логину «${r.rows[0].login}». Рассылка цен пойдёт раз в минуту по выбранным в профиле тикерам.`,
        );
      } else {
        await sendMessage(
          msg.chat.id,
          `Логин «${login}» не найден. Проверьте написание (как на сайте) и попробуйте снова: /start ВАШ_ЛОГИН`,
        );
      }
    } else if (parts[0] === "/start") {
      await sendMessage(
        msg.chat.id,
        `Отправьте: /start ВАШ_ЛОГИН_С_САЙТА — тот же логин, что при входе на платформу.`,
      );
    }
  }
}

async function sendPriceDigest() {
  const { rows } = await pool.query(`
    SELECT u.tg_chat_id, c.ticker
    FROM users u
    INNER JOIN user_ticker_alerts uta ON uta.user_id = u.id
    INNER JOIN companies c ON c.id = uta.company_id
    WHERE u.tg_chat_id IS NOT NULL
    ORDER BY u.tg_chat_id ASC, c.ticker ASC
  `);

  const byChat = new Map();
  for (const row of rows) {
    const chatId = Number(row.tg_chat_id);
    if (!Number.isFinite(chatId)) {
      continue;
    }
    if (!byChat.has(chatId)) {
      byChat.set(chatId, []);
    }
    byChat.get(chatId).push(row.ticker);
  }

  for (const [chatId, tickers] of byChat) {
    const unique = [...new Set(tickers)];
    const lines = ["DiplomApp · MOEX TQBR"];
    for (const t of unique) {
      const p = await fetchMoexLast(t);
      await new Promise((r) => setTimeout(r, 120));
      if (p == null) {
        lines.push(`${t}: —`);
      } else {
        lines.push(`${t}: ${p.toLocaleString("ru-RU", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`);
      }
    }
    const text = lines.join("\n").slice(0, 4000);
    await sendMessage(chatId, text);
  }
}

async function main() {
  console.log("Telegram bot connected to DB, polling…");

  setInterval(() => {
    void handleUpdates().catch((e) => console.error("updates", e));
  }, 1500);

  setInterval(() => {
    void sendPriceDigest().catch((e) => console.error("digest", e));
  }, 60_000);

  void sendPriceDigest().catch((e) => console.error("digest", e));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
