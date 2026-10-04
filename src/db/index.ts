import { config as loadEnv } from "dotenv";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

// Next.js/Vercel injecte process.env automatiquement. Ces deux lignes couvrent
// aussi les commandes Drizzle et les lancements Node hors Next en local.
loadEnv({ path: ".env" });
loadEnv({ path: ".env.local", override: true });

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error(
    [
      "DATABASE_URL est manquante.",
      "",
      "En local : copie .env.example en .env, colle ta chaîne Neon, puis relance npm run dev.",
      "Sur Vercel : Settings → Environment Variables → ajoute DATABASE_URL, puis redéploie.",
      "Aucune autre variable n'est obligatoire.",
    ].join("\n"),
  );
}

const globalForDb = globalThis as typeof globalThis & {
  __sniperFcPool?: Pool;
};

// Connexion poolée adaptée aux fonctions serverless Vercel + endpoint pooler Neon.
export const pool =
  globalForDb.__sniperFcPool ??
  new Pool({
    connectionString: databaseUrl,
    max: 3,
    idleTimeoutMillis: 10_000,
    connectionTimeoutMillis: 10_000,
    allowExitOnIdle: true,
  });

if (process.env.NODE_ENV !== "production") {
  globalForDb.__sniperFcPool = pool;
}

export const db = drizzle(pool);
