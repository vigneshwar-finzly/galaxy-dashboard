// Browser polyfills for libraries expecting Node globals
// Fixes: Uncaught ReferenceError: global is not defined (sockjs-client)

// Use globalThis to avoid redeclarations and DOM lib conflicts
const g = globalThis as any;

if (typeof g.global === 'undefined') {
  g.global = g;
}

if (typeof g.process === 'undefined') {
  g.process = { env: { DEBUG: undefined } };
}


