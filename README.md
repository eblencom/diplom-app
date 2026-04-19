# Diplom App

Next.js application with:
- Login and registration by `login` + `password`
- Password hashing with `bcrypt`
- PostgreSQL storage
- Role-based session (`admin` or `analyst`)

## 1) PostgreSQL setup

Create database:

```sql
CREATE DATABASE diplom_db;
```

Run schema from project root:

```bash
psql -U postgres -d diplom_db -f db/schema.sql
```

Если база уже создана раньше, примените новые миграции из `db/migration_*.sql` (например `migration_user_is_blocked.sql` для блокировки учётных записей, `migration_user_news_favorites.sql` для избранного в фильтре новостей).

> If `psql` is not in PATH, run it using full path from your PostgreSQL installation.

## 2) Environment variables

Copy `.env.example` to `.env`:

```bash
cp .env.example .env
```

Then set values in `.env`:
- `DATABASE_URL=postgresql://USER:PASSWORD@HOST:PORT/DB_NAME`
- `SESSION_SECRET=long_random_secret_string`
- `PYTHON_BIN=python` (or full path to Python)
- `NEWS_PARSER_LOG_PATH=./news_parser_log.txt`

Generate `SESSION_SECRET` example:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

## 3) Install and run

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

Экспорт дашборда в PDF подключает шрифт **`public/fonts/Roboto-Regular.ttf`** (кириллица). Файл нужен в деплое; при отсутствии PDF может снова отображать текст некорректно.

## 4) Roles

- Allowed roles in DB: `admin`, `analyst`
- New users are created with role `analyst`
- To change role, update it manually in PostgreSQL:

```sql
UPDATE users SET role = 'admin' WHERE login = 'your_login';
```

After next login, session will contain the updated role.

## Users table

`users` structure:
- `id` - auto-increment unique key
- `login` - unique login
- `password` - hash (not plain text)
- `role` - `admin` or `analyst`
- `tg_username` - currently stored as empty string by default

## Companies and news tables

`db/schema.sql` also creates:
- `companies` (`name`, `ticker`, `news_link`, `price_link`, `prices_path`)
- `news` (`company_id`, `text`, `datetime`) with `ON DELETE CASCADE`

## News parser (Python)

Install parser dependencies:

```bash
pip install -r scripts/requirements.txt
```

Parser file:
- `scripts/news_parser.py`

What parser does:
- Reads all companies with non-empty `news_link`
- Opens each company news page and parses links with class `article-title-link`
- Opens each news page and extracts:
  - publication datetime from `div.flex.flex-row.items-center > span` with text `Опубликовано ...`
  - news text from the first `<p>` in `div.article_WYSIWYG__O0uhw.article_articlePage__UMz3q`
- Saves only newer records compared to the latest news in DB for each company
- Uses fallback baseline date `25.03.2026` if company has no news in DB
- Writes run summary and saved items to `news_parser_log.txt` (or custom path from `NEWS_PARSER_LOG_PATH`)

## Auto run every minute (test mode)

The app starts background scheduler from server code and runs parser:
- immediately after first request
- then every 1 minute (temporarily for testing)

Scheduler file:
- `lib/news-parser-scheduler.ts`

## News on home page

Home page (`/home`) reads news from DB and shows:
- latest news list
- pagination with max `10` news per page
