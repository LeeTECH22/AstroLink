// Minimal Node typings for Vitest test files only.
// The application tsconfig is DOM-only (it does not pull in @types/node), but
// tests run under Node and may read files from disk. Declaring just the few
// built-ins used keeps @types/node out of the production type graph.
declare module 'node:fs' {
  export function readFileSync(path: string, encoding: 'utf-8'): string
}

declare const process: { cwd(): string }
