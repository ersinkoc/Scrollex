// The project has no @types/node; these are the only Node APIs the docs test uses.
declare module 'node:fs' {
  export function readFileSync(path: string, encoding: 'utf8'): string
  export function readdirSync(path: string): string[]
  export function statSync(path: string): { isDirectory(): boolean }
  export function writeFileSync(path: string, data: string): void
  export function mkdtempSync(prefix: string): string
  export function mkdirSync(path: string, options?: { recursive: boolean }): void
  export function rmSync(path: string, options?: { recursive: boolean; force: boolean }): void
}

declare module 'node:path' {
  export function join(...parts: string[]): string
  export function relative(from: string, to: string): string
}

declare module 'node:child_process' {
  export function execFileSync(file: string, args: string[], options: { cwd: string; stdio: 'pipe' }): unknown
}

declare module 'node:os' {
  export function tmpdir(): string
}

declare const process: { execPath: string }
interface Buffer { toString(): string }
declare const __dirname: string
