import { Pool } from "pg"

if (!process.env.DATABASE_URL) {
    console.error("❌ DATABASE_URL is missing in environment variables.")
}

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    connectionTimeoutMillis: 5000, // Time out connection attempt after 5s if DB is paused/unreachable
})

// Handle unexpected errors on idle pool clients
pool.on("error", (err) => {
    console.error("❌ Unexpected database pool error:", err.message)
})

export default pool