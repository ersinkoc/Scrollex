import { execFileSync } from 'node:child_process'
import { mkdirSync, rmSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

const root = join(__dirname, '..', '..')
// inside the repo (not the OS temp dir) so that 'react' resolves from node_modules
const dir = join(root, 'node_modules', '.cache', 'scrollex-drag-handle-props')
const LF = String.fromCharCode(10)

function tsc(name: string, code: string): string {
  writeFileSync(join(dir, name), code)
  try {
    execFileSync(process.execPath, [
      join(root, 'node_modules', 'typescript', 'bin', 'tsc'),
      '--noEmit', '--strict', '--target', 'es2020', '--module', 'esnext', '--moduleResolution', 'bundler',
      '--skipLibCheck', '--lib', 'es2021,dom', '--jsx', 'react-jsx', join(dir, name),
    ], { cwd: root, stdio: 'pipe' })
    return ''
  } catch (e) {
    return String((e as { stdout?: Buffer }).stdout ?? e)
  }
}

const head = [
  "import React from 'react'",
  "import { dragToReorder } from '../../../src/plugins/optional/drag-to-reorder.js'",
  "import type { DragToReorderAPI } from '../../../src/plugins/optional/drag-to-reorder.js'",
  'const api = dragToReorder({ onReorder: () => {} }).api as DragToReorderAPI',
  '',
].join(LF)

describe('DragHandleProps', () => {
  beforeAll(() => {
    rmSync(dir, { recursive: true, force: true })
    mkdirSync(dir, { recursive: true })
  })

  it('should reject a handler type that does not match (harness control)', () => {
    const output = tsc('control.tsx', head + 'export const a = <div onDragStart={(e: string) => {}} {...api.getDragHandleProps(0)} />' + LF)

    expect(output).toContain('error TS')
  }, 120000)

  it('should be spreadable on a React element and still callable with native drag events', () => {
    const output = tsc('spread.tsx', head + [
      'export const row = <div {...api.getDragHandleProps(0)} />',
      'export const handle = <button {...api.getDragHandleProps(1)} onDragEnd={(e: React.DragEvent) => { e.preventDefault() }} />',
      'export function nativeCall(event: DragEvent) {',
      '  const props = api.getDragHandleProps(2)',
      '  props.onDragStart(event)',
      '  props.onDrop(event)',
      '}',
      '',
    ].join(LF))

    expect(output).toBe('')
  }, 120000)
})
