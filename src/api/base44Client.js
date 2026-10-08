/**
 * Compatibility shim: re-exports the new `base44` surface from client.js so
 * every pre-existing `import { base44 } from '@/api/base44Client'` keeps
 * working, now backed by our own `/api/*` routes. Removed in phase 16's
 * final purge once every call site is on `import { api } from '@/api/client'`.
 */
export { base44 } from "./client";
