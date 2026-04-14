import { Pool, QueryResult, QueryResultRow } from "pg";

declare global {
  var postgresPool: Pool | undefined;
}

function getPool(): Pool {
  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    throw new Error("DATABASE_URL is not set");
  }

  if (!global.postgresPool) {
    global.postgresPool = new Pool({ connectionString });
  }

  return global.postgresPool;
}

export async function sql<T extends QueryResultRow>(
  text: string,
  params: unknown[] = [],
): Promise<QueryResult<T>> {
  return getPool().query<T>(text, params);
}
