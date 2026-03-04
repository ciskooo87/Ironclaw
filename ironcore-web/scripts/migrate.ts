import fs from "fs";
import path from "path";
import { Client } from "pg";

async function main() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) throw new Error("DATABASE_URL não definido");

  const client = new Client({ connectionString: databaseUrl });
  await client.connect();

  const dir = path.join(process.cwd(), "db", "migrations");
  const files = fs.readdirSync(dir).filter((f) => f.endsWith(".sql")).sort();

  for (const f of files) {
    const sql = fs.readFileSync(path.join(dir, f), "utf8");
    console.log(`Applying ${f}`);
    await client.query(sql);
  }

  await client.end();
  console.log("Migrations concluídas");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
