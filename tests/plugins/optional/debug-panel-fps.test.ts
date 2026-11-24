import { vi } from 'vitest'
import { createKernel } from '../../../src/kernel/kernel.js'
import { debugPanel } from '../../../src/plugins/optional/debug-panel/debug-panel.js'

// The FPS / frame-time counters used to start from the time the plugin was created (or last hidden): a panel shown
// late reported 0 fps in its first readings.

let clock = 0
let queue: Array<FrameRequestCallback | null> = []
const realRaf = globalThis.requestAnimationFrame
const realCancel = globalThis.cancelAnimationFrame
beforeEach(() => {
  clock = 0
  queue = []
  vi.spyOn(performance, 'now').mockImplementation(() => clock)
  globalThis.requestAnimationFrame = ((cb: FrameRequestCallback) => { queue.push(cb); return queue.length }) as typeof requestAnimationFrame
  globalThis.cancelAnimationFrame = ((id: number) => { queue[id - 1] = null }) as typeof cancelAnimationFrame
})
afterEach(() => { vi.restoreAllMocks(); globalThis.requestAnimationFrame = realRaf; globalThis.cancelAnimationFrame = realCancel })
const frame = () => { clock += 17; const q = queue; queue = []; q.forEach((cb) => cb?.(clock)) }

function firstFrames(idleMs: number) {
  const panel = debugPanel({ enabled: idleMs === 0 })
  const kernel = createKernel({ itemCount: 10 })
  kernel.register(panel)
  const api = panel.api as unknown as { show(): void; hide(): void; getStats(): { fps: number; frameTime: number } }
  clock += idleMs
  if (idleMs > 0) api.show()
  frame(); frame()
  const stats = api.getStats()
  // hide for a long while, show again
  api.hide()
  clock += 60000
  api.show()
  frame(); frame()
  const again = api.getStats()
  kernel.destroy()
  return { first: stats, again }
}


describe('debugPanel fps counters', () => {
  const sane = (s: { fps: number; frameTime: number }) => s.fps >= 30 && s.frameTime < 100

  it('should report sane readings for a panel shown right away (control)', () => {
    expect(sane(firstFrames(0).first)).toBe(true)
  })

  it('should report sane readings for a panel shown after a long idle time', () => {
    expect(sane(firstFrames(60000).first)).toBe(true)
  })

  it('should report sane readings after hide and show', () => {
    expect(sane(firstFrames(60000).again)).toBe(true)
    expect(sane(firstFrames(0).again)).toBe(true)
  })
})
