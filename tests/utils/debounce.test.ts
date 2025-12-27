import { vi } from 'vitest'
import { debounce, debounceLeading, debounceBoth } from '../../src/utils/debounce.js'

describe('debounce', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('should not execute immediately', () => {
    const fn = vi.fn()
    const debounced = debounce(fn, 100)

    debounced()
    expect(fn).not.toHaveBeenCalled()
  })

  it('should execute after wait period', () => {
    const fn = vi.fn()
    const debounced = debounce(fn, 100)

    debounced()
    vi.advanceTimersByTime(100)

    expect(fn).toHaveBeenCalledTimes(1)
  })

  it('should reset timer on subsequent calls', () => {
    const fn = vi.fn()
    const debounced = debounce(fn, 100)

    debounced('first')
    vi.advanceTimersByTime(50)
    debounced('second')
    vi.advanceTimersByTime(50)

    expect(fn).not.toHaveBeenCalled()

    vi.advanceTimersByTime(50)
    expect(fn).toHaveBeenCalledTimes(1)
    expect(fn).toHaveBeenCalledWith('second')
  })

  it('should pass correct arguments', () => {
    const fn = vi.fn()
    const debounced = debounce(fn, 100)

    debounced('arg1', 'arg2')
    vi.advanceTimersByTime(100)

    expect(fn).toHaveBeenCalledWith('arg1', 'arg2')
  })

  it('should preserve this context', () => {
    const obj = {
      value: 42,
      fn: vi.fn(function (this: { value: number }) {
        return this.value
      }),
      debounced: null as ReturnType<typeof debounce> | null,
    }
    obj.debounced = debounce(obj.fn, 100)

    obj.debounced()
    vi.advanceTimersByTime(100)

    expect(obj.fn).toHaveBeenCalled()
  })

  it('should cancel pending execution', () => {
    const fn = vi.fn()
    const debounced = debounce(fn, 100)

    debounced()
    debounced.cancel()
    vi.advanceTimersByTime(100)

    expect(fn).not.toHaveBeenCalled()
  })

  it('should flush pending execution immediately', () => {
    const fn = vi.fn()
    const debounced = debounce(fn, 100)

    debounced('test')
    debounced.flush()

    expect(fn).toHaveBeenCalledTimes(1)
    expect(fn).toHaveBeenCalledWith('test')
  })

  it('should not execute on flush if no pending call', () => {
    const fn = vi.fn()
    const debounced = debounce(fn, 100)

    debounced.flush()
    expect(fn).not.toHaveBeenCalled()
  })

  it('should handle multiple calls correctly', () => {
    const fn = vi.fn()
    const debounced = debounce(fn, 100)

    debounced('first')
    debounced('second')
    debounced('third')

    vi.advanceTimersByTime(100)

    expect(fn).toHaveBeenCalledTimes(1)
    expect(fn).toHaveBeenCalledWith('third')
  })
})

describe('debounceLeading', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('should execute immediately on first call', () => {
    const fn = vi.fn()
    const debounced = debounceLeading(fn, 100)

    debounced()
    expect(fn).toHaveBeenCalledTimes(1)
  })

  it('should not execute again during wait period', () => {
    const fn = vi.fn()
    const debounced = debounceLeading(fn, 100)

    debounced()
    debounced()
    debounced()

    expect(fn).toHaveBeenCalledTimes(1)
  })

  it('should allow execution after wait period', () => {
    const fn = vi.fn()
    const debounced = debounceLeading(fn, 100)

    debounced()
    vi.advanceTimersByTime(100)
    debounced()

    expect(fn).toHaveBeenCalledTimes(2)
  })

  it('should extend wait period on subsequent calls', () => {
    const fn = vi.fn()
    const debounced = debounceLeading(fn, 100)

    debounced() // t=0: executes, wait until t=100
    vi.advanceTimersByTime(50) // t=50
    debounced() // Extend wait until t=150
    vi.advanceTimersByTime(50) // t=100
    debounced() // Extend wait until t=200

    expect(fn).toHaveBeenCalledTimes(1)

    vi.advanceTimersByTime(100) // t=200: wait expired
    debounced() // Now can execute

    expect(fn).toHaveBeenCalledTimes(2)
  })

  it('should reset on cancel', () => {
    const fn = vi.fn()
    const debounced = debounceLeading(fn, 100)

    debounced()
    debounced.cancel()
    debounced()

    expect(fn).toHaveBeenCalledTimes(2)
  })

  it('should pass correct arguments', () => {
    const fn = vi.fn()
    const debounced = debounceLeading(fn, 100)

    debounced('arg1', 'arg2')
    expect(fn).toHaveBeenCalledWith('arg1', 'arg2')
  })
})

describe('debounceBoth', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('should execute immediately on first call', () => {
    const fn = vi.fn()
    const debounced = debounceBoth(fn, 100)

    debounced('first')
    expect(fn).toHaveBeenCalledTimes(1)
    expect(fn).toHaveBeenCalledWith('first')
  })

  it('should also execute after wait with last args', () => {
    const fn = vi.fn()
    const debounced = debounceBoth(fn, 100)

    debounced('first')
    debounced('second')
    debounced('third')

    expect(fn).toHaveBeenCalledTimes(1)

    vi.advanceTimersByTime(100)

    expect(fn).toHaveBeenCalledTimes(2)
    expect(fn).toHaveBeenLastCalledWith('third')
  })

  it('should reset leading edge after trailing call', () => {
    const fn = vi.fn()
    const debounced = debounceBoth(fn, 100)

    debounced('first')
    vi.advanceTimersByTime(100)
    debounced('second') // Should execute immediately again

    expect(fn).toHaveBeenCalledTimes(3)
    expect(fn).toHaveBeenLastCalledWith('second')
  })

  it('should cancel pending execution', () => {
    const fn = vi.fn()
    const debounced = debounceBoth(fn, 100)

    debounced('first')
    debounced('second')
    debounced.cancel()

    vi.advanceTimersByTime(100)

    expect(fn).toHaveBeenCalledTimes(1) // Only leading
    expect(fn).toHaveBeenCalledWith('first')
  })

  it('should flush pending execution', () => {
    const fn = vi.fn()
    const debounced = debounceBoth(fn, 100)

    debounced('first')
    debounced('second')
    debounced.flush()

    expect(fn).toHaveBeenCalledTimes(2)
    expect(fn).toHaveBeenLastCalledWith('second')
  })

  it('should reset to leading state after flush', () => {
    const fn = vi.fn()
    const debounced = debounceBoth(fn, 100)

    debounced('first')
    debounced.flush()
    debounced('second') // Should execute immediately

    expect(fn).toHaveBeenCalledTimes(3)
  })
})
