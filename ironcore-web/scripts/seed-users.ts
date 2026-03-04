import { dbQuery } from "../src/lib/db";
import { hashPassword } from "../src/lib/password";

async function upsertUser(email: string, name: string, role: "consultor" | "head" | "diretoria" | "admin_master", password: string) {
  const passwordHash = await hashPassword(password);
  await dbQuery(
    `insert into users(email, name, role, password_hash, active)
     values($1,$2,$3,$4,true)
     on conflict(email)
     do update set name=excluded.name, role=excluded.role, password_hash=excluded.password_hash, active=true`,
    [email.toLowerCase(), name, role, passwordHash]
  );
}

async function main() {
  await upsertUser("admin@ironcore.lat", "Admin Master", "admin_master", process.env.SEED_ADMIN_PASS || "ChangeMeNow!123");
  await upsertUser("head@ironcore.lat", "Head", "head", process.env.SEED_HEAD_PASS || "ChangeMeNow!123");
  await upsertUser("diretoria@ironcore.lat", "Diretoria", "diretoria", process.env.SEED_DIR_PASS || "ChangeMeNow!123");
  await upsertUser("consultor@ironcore.lat", "Consultor", "consultor", process.env.SEED_CONS_PASS || "ChangeMeNow!123");
  console.log("Users seeded/updated successfully.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
