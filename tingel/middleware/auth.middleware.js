import pool from "@/lib/db.lib"

export async function validateApiKey(req) {

    try {

        const authHeader = req.headers.get('Authorization')
        const apiKey = authHeader && authHeader.startsWith("Bearer ")
            ? authHeader.split(" ")[1]
            : req.headers.get('x-api-key')

        if (!apiKey) {
            return false
        }

        const resust = await pool.query(
            `SELECT id FROM api_keys WHERE key_value = $1 LIMIT 1`,
            [apiKey]
        )

        // $1 tells the pg to look for first varialbe in the array below
        // LIMIT 1 tells the postgressSql to stop searching asa soon as it matched a entry

        return resust.rowCount > 0

    } catch (error) {

        console.error(`API Key Validation Error: ${error.message}`)

        // If error is caused by DB connection failure (e.g. Supabase paused, DNS failed, connection refused), throw a descriptive error
        if (
            error.code === 'ECONNREFUSED' ||
            error.code === 'ETIMEDOUT' ||
            error.code === 'ENOTFOUND' ||
            error.code === 'EAI_AGAIN' ||
            error.code === '57P03' ||
            error.message?.includes('connect') ||
            error.message?.includes('timeout') ||
            error.message?.includes('getaddrinfo')
        ) {
            throw new Error(`Database Connection Error: Could not resolve or connect to database (${error.message}). Please check if your Supabase instance is active and DATABASE_URL is correct.`)
        }

        return false

    }

}