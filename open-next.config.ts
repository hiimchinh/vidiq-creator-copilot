import { defineCloudflareConfig } from "@opennextjs/cloudflare";

// No incremental cache: the home page is static and the API routes are dynamic.
export default defineCloudflareConfig({});
