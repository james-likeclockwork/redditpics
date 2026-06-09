// Ambient declarations for the untyped JS logger utility (logger.js).
// Typed as a permissive record of log functions so TS consumers resolve the
// import cleanly without type-checking the implementation.
export declare const logger: Record<string, (...args: any[]) => void>
