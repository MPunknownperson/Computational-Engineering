import { defineCloudflareConfig } from "@opennextjs/cloudflare";

/**
 * Cloudflare Workers / Pages adapter configuration.
 *
 * `npm run cf:build` runs `next build` and then wraps the output in a Worker
 * (`.open-next/worker.js` + `.open-next/assets`). No incremental-cache or
 * queue bindings are configured because the deployment is database-free and
 * fully stateless — every route either renders statically or recomputes from
 * the in-isolate store.
 */
export default defineCloudflareConfig();
