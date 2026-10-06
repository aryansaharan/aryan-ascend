import { config } from "zod/v4/core";

// Runs in the browser before any page code. The first time Zod builds an
// object schema (including inside the AI SDK) it probes for eval support with
// `new Function("")`. The Content-Security-Policy blocks eval, so that probe
// would be logged as a CSP violation on every AI page. Jitless mode skips the
// probe; validation works the same.
config({ jitless: true });
