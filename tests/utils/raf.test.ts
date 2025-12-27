import { vi } from 'vitest'
import {
  raf,
  cancelRaf,
  idle,
  cancelIdle,
  afterPaint,
  RAFBatcher,
  DOMBatcher,
} from '../../src/utils/raf.js'

describe('raf', () => {
  it('should call requestAnimationFrame', () => {
    const callback = vi.fn()
    const id = raf(callback)

    expect(typeof id).toBe('number')
    expect(requestAnimationFrame).toHaveBeenCalledWith(callback)
  })

  it('should return an id that can be cancelled', async () => {
    vi.useFakeTimers()
    const callback = vi.fn()
    const id = raf(callback)

    cancelRaf(id)
    await vi.advanceTimersByTimeAsync(16)

    expect(callback).not.toHaveBeenCalled()
    vi.useRealTimers()
  })
})

describe('cancelRaf', () => {
  it('should call cancelAnimationFrame', () => {
    cancelRaf(123)
    expect(cancelAnimationFrame).toHaveBeenCalledWith(123)
  })
})

describe('idle', () => {
  it('should call requestIdleCallback', () => {
    const callback = vi.fn()
    const id = idle(callback)

    expect(typeof id).toBe('number')
    expect(requestIdleCallback).toHaveBeenCalledWith(callback, undefined)
  })

  it('should pass options to requestIdleCallback', () => {
    const callback = vi.fn()
    idle(callback, { timeout: 100 })

    expect(requestIdleCallback).toHaveBeenCalledWith(callback, { timeout: 100 })
  })
})

describe('cancelIdle', () => {
  it('should call cancelIdleCallback', () => {
    cancelIdle(123)
    expect(cancelIdleCallback).toHaveBeenCalledWith(123)
  })
})

describe('afterPaint', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('should call callback after two animation frames', async () => {
    const callback = vi.fn()
    afterPaint(callback)

    expect(callback).not.toHaveBeenCalled()

    await vi.advanceTimersByTimeAsync(16)
    expect(callback).not.toHaveBeenCalled()

    await vi.advanceTimersByTimeAsync(16)
    expect(callback).toHaveBeenCalledTimes(1)
  })

  it('should return cancel function', async () => {
    const callback = vi.fn()
    const cancel = afterPaint(callback)

    cancel()

    await vi.advanceTimersByTimeAsync(32)
    expect(callback).not.toHaveBeenCalled()
  })
})

describe('RAFBatcher', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('should batch multiple callbacks into single frame', async () => {
    const batcher = new RAFBatcher()
    const callback1 = vi.fn()
    const callback2 = vi.fn()
    const callback3 = vi.fn()

    batcher.schedule(callback1)
    batcher.schedule(callback2)
    batcher.schedule(callback3)

    expect(callback1).not.toHaveBeenCalled()
    expect(callback2).not.toHaveBeenCalled()
    expect(callback3).not.toHaveBeenCalled()

    await vi.advanceTimersByTimeAsync(16)

    expect(callback1).toHaveBeenCalledTimes(1)
    expect(callback2).toHaveBeenCalledTimes(1)
    expect(callback3).toHaveBeenCalledTimes(1)
  })

  it('should not schedule duplicate callbacks', async () => {
    const batcher = new RAFBatcher()
    const callback = vi.fn()

    batcher.schedule(callback)
    batcher.schedule(callback)
    batcher.schedule(callback)

    await vi.advanceTimersByTimeAsync(16)

    expect(callback).toHaveBeenCalledTimes(1)
  })

  it('should flush immediately when called', () => {
    const batcher = new RAFBatcher()
    const callback = vi.fn()

    batcher.schedule(callback)
    batcher.flush()

    expect(callback).toHaveBeenCalledTimes(1)
  })

  it('should cancel all pending callbacks', async () => {
    const batcher = new RAFBatcher()
    const callback = vi.fn()

    batcher.schedule(callback)
    batcher.cancel()

    await vi.advanceTimersByTimeAsync(16)

    expect(callback).not.toHaveBeenCalled()
  })

  it('should allow scheduling after cancel', async () => {
    const batcher = new RAFBatcher()
    const callback = vi.fn()

    batcher.schedule(callback)
    batcher.cancel()
    batcher.schedule(callback)

    await vi.advanceTimersByTimeAsync(16)

    expect(callback).toHaveBeenCalledTimes(1)
  })
})

describe('DOMBatcher', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('should execute reads before writes', async () => {
    const batcher = new DOMBatcher()
    const order: string[] = []

    batcher.write(() => order.push('write1'))
    batcher.read(() => order.push('read1'))
    batcher.write(() => order.push('write2'))
    batcher.read(() => order.push('read2'))

    await vi.advanceTimersByTimeAsync(16)

    expect(order).toEqual(['read1', 'read2', 'write1', 'write2'])
  })

  it('should batch all operations into single frame', async () => {
    const batcher = new DOMBatcher()
    const read = vi.fn()
    const write = vi.fn()

    batcher.read(read)
    batcher.write(write)
    batcher.read(read)
    batcher.write(write)

    expect(read).not.toHaveBeenCalled()
    expect(write).not.toHaveBeenCalled()

    await vi.advanceTimersByTimeAsync(16)

    expect(read).toHaveBeenCalledTimes(2)
    expect(write).toHaveBeenCalledTimes(2)
  })

  it('should flush immediately when called', () => {
    const batcher = new DOMBatcher()
    const read = vi.fn()
    const write = vi.fn()

    batcher.read(read)
    batcher.write(write)
    batcher.flush()

    expect(read).toHaveBeenCalledTimes(1)
    expect(write).toHaveBeenCalledTimes(1)
  })

  it('should cancel all pending operations', async () => {
    const batcher = new DOMBatcher()
    const read = vi.fn()
    const write = vi.fn()

    batcher.read(read)
    batcher.write(write)
    batcher.cancel()

    await vi.advanceTimersByTimeAsync(16)

    expect(read).not.toHaveBeenCalled()
    expect(write).not.toHaveBeenCalled()
  })
})
