import { readFileSync } from 'node:fs'
import { join } from 'node:path'

const root = join(__dirname, '..', '..')
const read = (file: string) => readFileSync(join(root, file), 'utf8')
const version = (v: string) => v.split('.').map(Number).reduce((acc, n, i) => acc + n / Math.pow(100, i), 0)

// First versions that have what the package uses (MDN / caniuse): ResizeObserver, which the kernel and the hooks create
// without a guard, and ES2020 optional chaining / nullish coalescing, which the build keeps (tsconfig target ES2020)
const firstVersions = {
  ResizeObserver: { chrome: '64', firefox: '69', safari: '13.1', edge: '79' },
  'optional chaining': { chrome: '80', firefox: '74', safari: '13.1', edge: '80' },
}
const browsers = ['chrome', 'firefox', 'safari', 'edge'] as const
const required = (browser: (typeof browsers)[number]) =>
  Object.values(firstVersions).map((v) => v[browser]).reduce((a, b) => (version(a) >= version(b) ? a : b))

describe('documented browser support', () => {
  it('should rely on the features the minimums are derived from', () => {
    expect(read('src/kernel/viewport.ts')).toContain('new ResizeObserver')
    expect(read('tsconfig.json')).toMatch(/"target":\s*"ES2020"/)
  })

  it('should not promise a browser version older than what the package needs', () => {
    const pages = ['LLMS.md', 'README.md', 'CHANGELOG.md']
    for (const page of pages) {
      const text = read(page)
      for (const browser of browsers) {
        const name = browser[0]!.toUpperCase() + browser.slice(1)
        const claims = [...text.matchAll(new RegExp(`${name}[^0-9\n]*(\d+(?:\.\d+)?)\+`, 'g'))].map((m) => m[1]!)
        for (const claim of claims) {
          expect(`${page} ${browser} ${version(claim) >= version(required(browser))}`).toBe(`${page} ${browser} true`)
        }
      }
    }
  })

  it('should state a browser minimum at all (harness control)', () => {
    expect(read('LLMS.md')).toMatch(/Safari \| 13\.1\+/)
  })
})
