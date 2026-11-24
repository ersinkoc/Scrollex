// Smooth scroll, first frame: smooth scroll takes its start time from performance.now() when it is called, and the rAF callback's
// timestamp can be earlier than that (a frame's timestamp is its start; the call may happen later in the same frame).
// progress = elapsed / duration is then negative, and an out-easing (easeOut = t*(2-t)) maps it below 0: the first frame
// scrolls BACKWARD past the start offset. Control: a frame timestamp after the start moves forward.
import { createKernel } from '../../src/kernel/kernel.js'
import { easings } from '../../src/kernel/scroll-engine.js'
import { scrollControllerPlugin } from '../../src/plugins/core/scroll-controller.js'
import type { ScrollControllerAPI } from '../../src/plugins/core/scroll-controller.js'


let frames: FrameRequestCallback[] = []
const realRaf = globalThis.requestAnimationFrame
beforeEach(() => {
  frames = []
  vi.spyOn(performance, 'now').mockImplementation(() => 1000)
  globalThis.requestAnimationFrame = ((cb: FrameRequestCallback) => { frames.push(cb); return frames.length }) as typeof requestAnimationFrame
})
afterEach(() => { vi.restoreAllMocks(); globalThis.requestAnimationFrame = realRaf })

function container(start: number) {
  let top = start
  const el = document.createElement('div')
  Object.defineProperty(el, 'scrollTop', { get: () => top, set: (v: number) => { top = v }, configurable: true })
  Object.defineProperty(el, 'clientHeight', { get: () => 400, configurable: true })
  Object.defineProperty(el, 'clientWidth', { get: () => 300, configurable: true })
  return { el, top: () => top }
}

function firstFrame(via: 'engine' | 'controller', frameTime: number): number {
  const c = container(1000)
  const kernel = createKernel({ itemCount: 1000, estimatedItemHeight: 50 })
  kernel.attach(c.el)
  if (via === 'engine') {
    kernel.scrollTo(3000, { behavior: 'smooth', duration: 300, easing: easings.easeOut })
  } else {
    const plugin = scrollControllerPlugin()
    kernel.register(plugin)
    ;(plugin.api as ScrollControllerAPI).scrollTo(3000, { behavior: 'smooth', duration: 300, easing: easings.easeOut })
  }
  const pending = frames.splice(0)
  pending.forEach((cb) => cb(frameTime))
  const result = c.top()
  kernel.destroy()
  return result
}


describe('smooth scroll first frame', () => {
  it('should move forward when the frame is after the start (control)', () => {
    expect(firstFrame('engine', 1016)).toBeGreaterThan(1000)
    expect(firstFrame('controller', 1016)).toBeGreaterThan(1000)
  })

  it('should not move backward when the first frame timestamp precedes the start', () => {
    expect(firstFrame('engine', 990)).toBeGreaterThanOrEqual(1000)
    expect(firstFrame('controller', 990)).toBeGreaterThanOrEqual(1000)
  })
})
