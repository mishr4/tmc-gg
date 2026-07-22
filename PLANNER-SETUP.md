# Mavion Planner setup

The private planner is available at `/planner`. It intentionally has no local-only storage fallback. Every saved class, assignment, and note is written to the server store.

## Vercel environment variables

1. Add Upstash Redis from the Vercel Marketplace, or connect an existing Upstash database.
2. Set `KV_REST_API_URL` and `KV_REST_API_TOKEN`, or `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN`.
3. Set `PLANNER_PASSCODE`. It currently defaults to `Mavion` for first deployment.
4. Set `PLANNER_SESSION_SECRET` to a long random value for secure login-cookie signing.
5. Keep `GROQ_API_KEY` configured for the integrated Seehed planner assistant.
6. Redeploy after changing environment variables.

Planner data uses the Redis key `mavion:planner:alexander:v1`. Sessions expire after seven days. Revision checks prevent an older browser tab from silently overwriting newer work.
