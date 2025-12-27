import { vi } from 'vitest'
import { throttle, throttleRAF, throttleLeading } from '../../src/utils/throttle.js'

describe('throttle', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('should execute immediately on first call', () => {
    const fn = vi.fn()
    const throttled = throttle(fn, 100)

    throttled()
    expect(fn).toHaveBeenCalledTimes(1)
  })

  it('should not execute again within wait period', () => {
    const fn = vi.fn()
    const throttled = throttle(fn, 100)

    throttled()
    throttled()
    throttled()

    expect(fn).toHaveBeenCalledTimes(1)
  })

  it('should execute after wait period', () => {
    const fn = vi.fn()
    const throttled = throttle(fn, 100)

    throttled()
    expect(fn).toHaveBeenCalledTimes(1)

    vi.advanceTimersByTime(100)
    throttled()

    expect(fn).toHaveBeenCalledTimes(2)
  })

  it('should execute trailing call after wait', () => {
    const fn = vi.fn()
    const throttled = throttle(fn, 100)

    throttled('first')
    throttled('second')
    throttled('third')

    expect(fn).toHaveBeenCalledTimes(1)
    expect(fn).toHaveBeenLastCalledWith('first')

    vi.advanceTimersByTime(100)

    expect(fn).toHaveBeenCalledTimes(2)
    expect(fn).toHaveBeenLastCalledWith('third')
  })

  it('should pass correct arguments', () => {
    const fn = vi.fn()
    const throttled = throttle(fn, 100)

    throttled('arg1', 'arg2')
    expect(fn).toHaveBeenCalledWith('arg1', 'arg2')
  })

  it('should preserve this context', () => {
    const obj = {
      value: 42,
      fn: vi.fn(function (this: { value: number }) {
        return this.value
      }),
      throttled: null as ReturnType<typeof throttle> | null,
    }
    obj.throttled = throttle(obj.fn, 100)

    obj.throttled()
    expect(obj.fn).toHaveBeenCalled()
  })

  it('should cancel pending execution', () => {
    const fn = vi.fn()
    const throttled = throttle(fn, 100)

    throttled()
    throttled() // This should schedule a trailing call

    throttled.cancel()
    vi.advanceTimersByTime(100)

    expect(fn).toHaveBeenCalledTimes(1) // Only first call, trailing cancelled
  })

  it('should handle cancel when no pending call', () => {
    const fn = vi.fn()
    const throttled = throttle(fn, 100)

    throttled.cancel() // Should not throw
    expect(fn).not.toHaveBeenCalled()
  })
})

describe('throttleRAF', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('should execute on next frame', async () => {
    const fn = vi.fn()
    const throttled = throttleRAF(fn)

    throttled()
    expect(fn).not.toHaveBeenCalled()

    await vi.advanceTimersByTimeAsync(16)
    expect(fn).toHaveBeenCalledTimes(1)
  })

  it('should only execute once per frame', async () => {
    const fn = vi.fn()
    const throttled = throttleRAF(fn)

    throttled('first')
    throttled('second')
    throttled('third')

    await vi.advanceTimersByTimeAsync(16)

    expect(fn).toHaveBeenCalledTimes(1)
    expect(fn).toHaveBeenLastCalledWith('third')
  })

  it('should allow execution on next frame after previous completes', async () => {
    const fn = vi.fn()
    const throttled = throttleRAF(fn)

    throttled('first')
    await vi.advanceTimersByTimeAsync(16)

    throttled('second')
    await vi.advanceTimersByTimeAsync(16)

    expect(fn).toHaveBeenCalledTimes(2)
  })

  it('should cancel pending execution', async () => {
    const fn = vi.fn()
    const throttled = throttleRAF(fn)

    throttled()
    throttled.cancel()

    await vi.advanceTimersByTimeAsync(16)
    expect(fn).not.toHaveBeenCalled()
  })

  it('should handle cancel when no pending call', () => {
    const fn = vi.fn()
    const throttled = throttleRAF(fn)

    throttled.cancel() // Should not throw
    expect(fn).not.toHaveBeenCalled()
  })

  it('should pass arguments to function', async () => {
    const fn = vi.fn()
    const throttled = throttleRAF(fn)

    throttled('arg1', 123)
    await vi.advanceTimersByTimeAsync(16)

    expect(fn).toHaveBeenCalledWith('arg1', 123)
  })
})

describe('throttleLeading', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('should execute immediately on first call', () => {
    const fn = vi.fn()
    const throttled = throttleLeading(fn, 100)

    throttled()
    expect(fn).toHaveBeenCalledTimes(1)
  })

  it('should ignore calls within wait period', () => {
    const fn = vi.fn()
    const throttled = throttleLeading(fn, 100)

    throttled()
    throttled()
    throttled()

    expect(fn).toHaveBeenCalledTimes(1)
  })

  it('should not have trailing call', () => {
    const fn = vi.fn()
    const throttled = throttleLeading(fn, 100)

    throttled('first')
    throttled('second')

    vi.advanceTimersByTime(100)

    // Unlike regular throttle, no trailing call
    expect(fn).toHaveBeenCalledTimes(1)
    expect(fn).toHaveBeenCalledWith('first')
  })

  it('should execute again after wait period', () => {
    const fn = vi.fn()
    const throttled = throttleLeading(fn, 100)

    throttled('first')
    vi.advanceTimersByTime(100)
    throttled('second')

    expect(fn).toHaveBeenCalledTimes(2)
    expect(fn).toHaveBeenLastCalledWith('second')
  })

  it('should reset on cancel', () => {
    const fn = vi.fn()
    const throttled = throttleLeading(fn, 100)

    throttled('first')
    throttled.cancel()

    // Should execute immediately after cancel
    throttled('second')
    expect(fn).toHaveBeenCalledTimes(2)
  })

  it('should pass correct arguments', () => {
    const fn = vi.fn()
    const throttled = throttleLeading(fn, 100)

    throttled('arg1', 'arg2')
    expect(fn).toHaveBeenCalledWith('arg1', 'arg2')
  })
})
