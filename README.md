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

> If `psql` is not in PATH, run it using full path from your PostgreSQL installation.

## 2) Environment variables

Copy `.env.example` to `.env`:

```bash
cp .env.example .env
```

Then set values in `.env`:
- `DATABASE_URL=postgresql://USER:PASSWORD@HOST:PORT/DB_NAME`
- `SESSION_SECRET=long_random_secret_string`

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
