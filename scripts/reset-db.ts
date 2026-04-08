import { neon } from "@neondatabase/serverless"
import * as dotenv from "dotenv"

dotenv.config({ path: ".env.local" })

const sql = neon(process.env.DATABASE_URL!)

async function main() {
  console.log("Dropping schema...")
  await sql`DROP SCHEMA public CASCADE`
  await sql`CREATE SCHEMA public`
  console.log("Done. Run: npx drizzle-kit push")
}

main().catch((e) => { console.error(e); process.exit(1) })
