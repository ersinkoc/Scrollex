import { vi } from 'vitest'
import { createKernel } from '../../../src/kernel/kernel.js'
import { keyboardNav } from '../../../src/plugins/optional/keyboard-nav.js'
import type { Kernel } from '../../../src/types.js'

// keyboardNav listens on the document and most tests never uninstall their plugin: drop the
// document listeners a test added so one test's plugin cannot react to the next test's keys
const addedDocumentListeners: Array<[string, EventListenerOrEventListenerObject]> = []
const addDocumentListener = document.addEventListener.bind(document)
beforeAll(() => {
  vi.spyOn(document, 'addEventListener').mockImplementation((type: string, listener: EventListenerOrEventListenerObject, options?: boolean | AddEventListenerOptions) => {
    addedDocumentListeners.push([type, listener])
    addDocumentListener(type, listener, options)
  })
})
afterEach(() => {
  for (const [type, listener] of addedDocumentListeners.splice(0)) {
    document.removeEventListener(type, listener)
  }
})
afterAll(() => {
  vi.mocked(document.addEventListener).mockRestore()
})

// Mock kernel
function createMockKernel(options: { itemCount?: number } = {}): Kernel {
  const { itemCount = 100 } = options

  return {
    getItemCount: vi.fn(() => itemCount),
    scrollToIndex: vi.fn(),
    configure: vi.fn(),
    attach: vi.fn(),
    detach: vi.fn(),
    destroy: vi.fn(),
    getScrollPosition: vi.fn(() => ({ scrollTop: 0, scrollLeft: 0 })),
    getVisibleRange: vi.fn(() => ({ startIndex: 0, endIndex: 10, overscanStartIndex: 0, overscanEndIndex: 10 })),
    getRenderRange: vi.fn(() => ({ startIndex: 0, endIndex: 10, overscanStartIndex: 0, overscanEndIndex: 10 })),
    getTotalSize: vi.fn(() => 5000),
    getViewport: vi.fn(() => ({ top: 0, left: 0, width: 300, height: 400, bottom: 400, right: 300 })),
    scrollTo: vi.fn(),
    measureItem: vi.fn(),
    getCachedHeight: vi.fn(() => 50),
    getEstimatedHeight: vi.fn(() => 50),
    invalidateMeasurement: vi.fn(),
    invalidateAllMeasurements: vi.fn(),
    isScrolling: vi.fn(() => false),
    on: vi.fn(() => vi.fn()),
    off: vi.fn(),
    emit: vi.fn(),
    register: vi.fn(),
    unregister: vi.fn(),
    getPlugin: vi.fn(),
    getPlugins: vi.fn(() => []),
    hasPlugin: vi.fn(),
    setScrollPosition: vi.fn(),
    getItemOffset: vi.fn((index: number) => index * 50),
    getOptions: vi.fn(() => ({ overscan: 2 })),
  } as unknown as Kernel
}

function createKeyboardEvent(key: string, options: Partial<KeyboardEvent> = {}): KeyboardEvent {
  return new KeyboardEvent('keydown', {
    key,
    bubbles: true,
    cancelable: true,
    ...options,
  })
}

describe('keyboardNav', () => {
  let kernel: Kernel

  beforeEach(() => {
    vi.useFakeTimers()
    kernel = createMockKernel()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  describe('installation', () => {
    it('should install with default options', () => {
      const plugin = keyboardNav()

      expect(plugin.name).toBe('keyboard-nav')
      expect(plugin.version).toBe('1.0.0')
      expect(plugin.type).toBe('optional')

      plugin.install?.(kernel)

      expect(plugin.api?.isEnabled()).toBe(true)
    })

    it('should install with disabled state', () => {
      const plugin = keyboardNav({ enabled: false })
      plugin.install?.(kernel)

      expect(plugin.api?.isEnabled()).toBe(false)
    })

    it('should uninstall and clean up', () => {
      const plugin = keyboardNav()
      plugin.install?.(kernel)

      plugin.api?.setFocusedIndex(5)
      plugin.uninstall?.()

      expect(plugin.api?.getFocusedIndex()).toBeNull()
    })
  })

  describe('focus management', () => {
    it('should get and set focused index', () => {
      const plugin = keyboardNav()
      plugin.install?.(kernel)

      expect(plugin.api?.getFocusedIndex()).toBeNull()

      plugin.api?.setFocusedIndex(5)

      expect(plugin.api?.getFocusedIndex()).toBe(5)
    })

    it('should clamp focus to valid range', () => {
      const plugin = keyboardNav()
      plugin.install?.(kernel)

      plugin.api?.setFocusedIndex(150)

      expect(plugin.api?.getFocusedIndex()).toBe(99)

      plugin.api?.setFocusedIndex(-5)

      expect(plugin.api?.getFocusedIndex()).toBe(0)
    })

    it('should handle loop mode', () => {
      const plugin = keyboardNav({ loop: true })
      plugin.install?.(kernel)

      // Go past end
      plugin.api?.setFocusedIndex(100)
      expect(plugin.api?.getFocusedIndex()).toBe(0)

      // Go before start
      plugin.api?.setFocusedIndex(-1)
      expect(plugin.api?.getFocusedIndex()).toBe(99)
    })

    it('should call onFocus callback', () => {
      const onFocus = vi.fn()
      const plugin = keyboardNav({ onFocus })
      plugin.install?.(kernel)

      plugin.api?.setFocusedIndex(5)

      expect(onFocus).toHaveBeenCalledWith(5)
    })

    it('should scroll focused item into view', () => {
      const plugin = keyboardNav()
      plugin.install?.(kernel)

      plugin.api?.setFocusedIndex(50)

      expect(kernel.scrollToIndex).toHaveBeenCalledWith(50, { align: 'auto' })
    })
  })

  describe('focusNext/focusPrevious', () => {
    it('should focus next item', () => {
      const plugin = keyboardNav()
      plugin.install?.(kernel)

      plugin.api?.setFocusedIndex(5)
      plugin.api?.focusNext()

      expect(plugin.api?.getFocusedIndex()).toBe(6)
    })

    it('should focus previous item', () => {
      const plugin = keyboardNav()
      plugin.install?.(kernel)

      plugin.api?.setFocusedIndex(5)
      plugin.api?.focusPrevious()

      expect(plugin.api?.getFocusedIndex()).toBe(4)
    })

    it('should handle grid navigation in focusNext', () => {
      const plugin = keyboardNav({ orientation: 'grid', columns: 3 })
      plugin.install?.(kernel)

      plugin.api?.setFocusedIndex(0)
      plugin.api?.focusNext()

      // Grid focusNext moves by columns
      expect(plugin.api?.getFocusedIndex()).toBe(3)
    })
  })

  describe('focusFirst/focusLast', () => {
    it('should focus first item', () => {
      const plugin = keyboardNav()
      plugin.install?.(kernel)

      plugin.api?.setFocusedIndex(50)
      plugin.api?.focusFirst()

      expect(plugin.api?.getFocusedIndex()).toBe(0)
    })

    it('should focus last item', () => {
      const plugin = keyboardNav()
      plugin.install?.(kernel)

      plugin.api?.setFocusedIndex(0)
      plugin.api?.focusLast()

      expect(plugin.api?.getFocusedIndex()).toBe(99)
    })
  })

  describe('selectFocused', () => {
    it('should call onSelect with focused index', () => {
      const onSelect = vi.fn()
      const plugin = keyboardNav({ onSelect })
      plugin.install?.(kernel)

      plugin.api?.setFocusedIndex(10)
      plugin.api?.selectFocused()

      expect(onSelect).toHaveBeenCalledWith(10)
    })

    it('should not call onSelect if nothing focused', () => {
      const onSelect = vi.fn()
      const plugin = keyboardNav({ onSelect })
      plugin.install?.(kernel)

      plugin.api?.selectFocused()

      expect(onSelect).not.toHaveBeenCalled()
    })
  })

  describe('enable/disable', () => {
    it('should enable navigation', () => {
      const plugin = keyboardNav({ enabled: false })
      plugin.install?.(kernel)

      plugin.api?.enable()

      expect(plugin.api?.isEnabled()).toBe(true)
    })

    it('should disable navigation', () => {
      const plugin = keyboardNav()
      plugin.install?.(kernel)

      plugin.api?.disable()

      expect(plugin.api?.isEnabled()).toBe(false)
    })
  })

  describe('keyboard events', () => {
    it('should handle ArrowDown in vertical mode', () => {
      const plugin = keyboardNav({ orientation: 'vertical' })
      plugin.install?.(kernel)

      plugin.api?.setFocusedIndex(5)

      const event = createKeyboardEvent('ArrowDown')
      document.dispatchEvent(event)

      expect(plugin.api?.getFocusedIndex()).toBe(6)
    })

    it('should handle ArrowUp in vertical mode', () => {
      const plugin = keyboardNav({ orientation: 'vertical' })
      plugin.install?.(kernel)

      plugin.api?.setFocusedIndex(5)

      const event = createKeyboardEvent('ArrowUp')
      document.dispatchEvent(event)

      expect(plugin.api?.getFocusedIndex()).toBe(4)
    })

    it('should handle ArrowRight in horizontal mode', () => {
      const plugin = keyboardNav({ orientation: 'horizontal' })
      plugin.install?.(kernel)

      plugin.api?.setFocusedIndex(5)

      const event = createKeyboardEvent('ArrowRight')
      document.dispatchEvent(event)

      expect(plugin.api?.getFocusedIndex()).toBe(6)
    })

    it('should handle ArrowLeft in horizontal mode', () => {
      const plugin = keyboardNav({ orientation: 'horizontal' })
      plugin.install?.(kernel)

      plugin.api?.setFocusedIndex(5)

      const event = createKeyboardEvent('ArrowLeft')
      document.dispatchEvent(event)

      expect(plugin.api?.getFocusedIndex()).toBe(4)
    })

    it('should handle grid navigation with columns', () => {
      const plugin = keyboardNav({ orientation: 'grid', columns: 4 })
      plugin.install?.(kernel)

      plugin.api?.setFocusedIndex(5)

      // ArrowDown moves by columns
      document.dispatchEvent(createKeyboardEvent('ArrowDown'))
      expect(plugin.api?.getFocusedIndex()).toBe(9)

      // ArrowUp moves back by columns
      document.dispatchEvent(createKeyboardEvent('ArrowUp'))
      expect(plugin.api?.getFocusedIndex()).toBe(5)

      // ArrowRight moves by 1
      document.dispatchEvent(createKeyboardEvent('ArrowRight'))
      expect(plugin.api?.getFocusedIndex()).toBe(6)

      // ArrowLeft moves by 1
      document.dispatchEvent(createKeyboardEvent('ArrowLeft'))
      expect(plugin.api?.getFocusedIndex()).toBe(5)
    })

    it('should handle Home key', () => {
      const plugin = keyboardNav()
      plugin.install?.(kernel)

      plugin.api?.setFocusedIndex(50)

      document.dispatchEvent(createKeyboardEvent('Home'))

      expect(plugin.api?.getFocusedIndex()).toBe(0)
    })

    it('should handle End key', () => {
      const plugin = keyboardNav()
      plugin.install?.(kernel)

      plugin.api?.setFocusedIndex(0)

      document.dispatchEvent(createKeyboardEvent('End'))

      expect(plugin.api?.getFocusedIndex()).toBe(99)
    })

    it('should handle PageDown key', () => {
      const plugin = keyboardNav({ pageSize: 10 })
      plugin.install?.(kernel)

      plugin.api?.setFocusedIndex(5)

      document.dispatchEvent(createKeyboardEvent('PageDown'))

      expect(plugin.api?.getFocusedIndex()).toBe(15)
    })

    it('should handle PageUp key', () => {
      const plugin = keyboardNav({ pageSize: 10 })
      plugin.install?.(kernel)

      plugin.api?.setFocusedIndex(25)

      document.dispatchEvent(createKeyboardEvent('PageUp'))

      expect(plugin.api?.getFocusedIndex()).toBe(15)
    })

    it('should handle Enter key for selection', () => {
      const onSelect = vi.fn()
      const plugin = keyboardNav({ onSelect })
      plugin.install?.(kernel)

      plugin.api?.setFocusedIndex(10)

      document.dispatchEvent(createKeyboardEvent('Enter'))

      expect(onSelect).toHaveBeenCalledWith(10)
    })

    it('should handle Space key for selection', () => {
      const onSelect = vi.fn()
      const plugin = keyboardNav({ onSelect })
      plugin.install?.(kernel)

      plugin.api?.setFocusedIndex(10)

      document.dispatchEvent(createKeyboardEvent(' '))

      expect(onSelect).toHaveBeenCalledWith(10)
    })

    it('should not handle keys when disabled', () => {
      const plugin = keyboardNav({ enabled: false })
      plugin.install?.(kernel)

      plugin.api?.setFocusedIndex(5)

      document.dispatchEvent(createKeyboardEvent('ArrowDown'))

      expect(plugin.api?.getFocusedIndex()).toBe(5)
    })

    it('should call custom onKeyDown handler', () => {
      const onKeyDown = vi.fn().mockReturnValue(true)
      const plugin = keyboardNav({ onKeyDown })
      plugin.install?.(kernel)

      plugin.api?.setFocusedIndex(5)

      document.dispatchEvent(createKeyboardEvent('ArrowDown'))

      expect(onKeyDown).toHaveBeenCalled()
      // Custom handler returned true, so default behavior should be skipped
      expect(plugin.api?.getFocusedIndex()).toBe(5)
    })

    it('should start at the first item when moving forward with nothing focused', () => {
      const plugin = keyboardNav()
      plugin.install?.(kernel)

      document.dispatchEvent(createKeyboardEvent('ArrowDown'))

      expect(plugin.api?.getFocusedIndex()).toBe(0)
    })
  })

  describe('typeahead', () => {
    it('should search for matching items', () => {
      // Use alphabetically unique names so search is deterministic
      const items = ['Apple', 'Banana', 'Cherry', 'Date', 'Elderberry']
      const getItemText = vi.fn((index: number) => items[index] ?? '')
      kernel = createMockKernel({ itemCount: items.length })
      const plugin = keyboardNav({ typeahead: true, getItemText })
      plugin.install?.(kernel)

      // Type 'c' to find 'Cherry' at index 2
      document.dispatchEvent(createKeyboardEvent('c'))

      expect(plugin.api?.getFocusedIndex()).toBe(2)
    })

    it('should clear typeahead buffer after timeout', async () => {
      const getItemText = vi.fn((index: number) => `Item ${index}`)
      const plugin = keyboardNav({
        typeahead: true,
        typeaheadTimeout: 500,
        getItemText,
      })
      plugin.install?.(kernel)

      document.dispatchEvent(createKeyboardEvent('a'))

      await vi.advanceTimersByTimeAsync(600)

      plugin.api?.clearTypeahead()

      // Buffer should be cleared
    })

    it('should manually clear typeahead', () => {
      const getItemText = vi.fn((index: number) => `Item ${index}`)
      const plugin = keyboardNav({ typeahead: true, getItemText })
      plugin.install?.(kernel)

      document.dispatchEvent(createKeyboardEvent('I'))

      plugin.api?.clearTypeahead()

      // Should not throw
    })
  })

  describe('hooks', () => {
    it('should adjust focus when items change', () => {
      const plugin = keyboardNav()
      plugin.install?.(kernel)

      plugin.api?.setFocusedIndex(95)

      // Simulate items shrinking
      ;(kernel.getItemCount as ReturnType<typeof vi.fn>).mockReturnValue(50)

      plugin.hooks?.onItemsChange?.(50, 100)

      expect(plugin.api?.getFocusedIndex()).toBe(49)
    })

    it('should clear focus when items become empty', () => {
      const plugin = keyboardNav()
      plugin.install?.(kernel)

      plugin.api?.setFocusedIndex(5)

      ;(kernel.getItemCount as ReturnType<typeof vi.fn>).mockReturnValue(0)

      plugin.hooks?.onItemsChange?.(0, 100)

      expect(plugin.api?.getFocusedIndex()).toBeNull()
    })
  })

  describe('empty list', () => {
    it('should handle empty item list', () => {
      kernel = createMockKernel({ itemCount: 0 })
      const plugin = keyboardNav()
      plugin.install?.(kernel)

      document.dispatchEvent(createKeyboardEvent('ArrowDown'))

      expect(plugin.api?.getFocusedIndex()).toBeNull()
    })
  })
})

describe('keyboardNav editable targets', () => {
  it('should not hijack keys typed into form fields', () => {
    const kernel = createKernel({ itemCount: 50, estimatedItemHeight: 50 })
    const onSelect = vi.fn()
    const plugin = keyboardNav({ onSelect })
    kernel.register(plugin)
    plugin.api?.setFocusedIndex(3)
    const input = document.createElement('input')
    document.body.appendChild(input)

    const space = new KeyboardEvent('keydown', { key: ' ', bubbles: true, cancelable: true })
    input.dispatchEvent(space)
    const home = new KeyboardEvent('keydown', { key: 'Home', bubbles: true, cancelable: true })
    input.dispatchEvent(home)

    expect(space.defaultPrevented).toBe(false)
    expect(home.defaultPrevented).toBe(false)
    expect(onSelect).not.toHaveBeenCalled()
    expect(plugin.api?.getFocusedIndex()).toBe(3)
    input.remove()
    kernel.destroy()
  })
})

describe('keyboardNav modified keys', () => {
  function press(key: string, init: KeyboardEventInit = {}): boolean {
    const event = new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true, ...init })
    document.body.dispatchEvent(event)
    return event.defaultPrevented
  }

  it('should leave Alt, Ctrl and Meta combinations to the browser', () => {
    const cases: Array<[string, KeyboardEventInit, 'vertical' | 'horizontal']> = [
      ['ArrowLeft', { altKey: true }, 'horizontal'],
      ['Home', { ctrlKey: true }, 'vertical'],
      ['End', { metaKey: true }, 'vertical'],
      ['PageDown', { ctrlKey: true }, 'vertical'],
    ]
    for (const [key, init, orientation] of cases) {
      const kernel = createKernel({ itemCount: 50, estimatedItemHeight: 50 })
      const plugin = keyboardNav({ orientation })
      kernel.register(plugin)

      expect(press(key, init)).toBe(false)
      expect(plugin.api?.getFocusedIndex()).toBeNull()
      kernel.destroy()
    }
  })

  it('should still pass modified keys to the custom handler and keep Shift navigating', () => {
    const kernel = createKernel({ itemCount: 50, estimatedItemHeight: 50 })
    const onKeyDown = vi.fn()
    const plugin = keyboardNav({ onKeyDown })
    kernel.register(plugin)

    press('a', { ctrlKey: true })
    expect(onKeyDown).toHaveBeenCalledTimes(1)
    expect(press('ArrowDown', { shiftKey: true })).toBe(true)
    kernel.destroy()
  })
})

describe('keyboardNav typeahead start', () => {
  const words = ['apple', 'apricot', 'banana', 'blueberry', 'cherry']

  function setup() {
    const kernel = createKernel({ itemCount: words.length, estimatedItemHeight: 50 })
    const plugin = keyboardNav({ typeahead: true, getItemText: (index) => words[index]! })
    kernel.register(plugin)
    return { kernel, plugin }
  }
  const type = (...keys: string[]) => keys.forEach((key) => document.body.dispatchEvent(createKeyboardEvent(key)))

  it('should focus the first match when nothing was focused', () => {
    const { kernel, plugin } = setup()

    type('a')

    expect(plugin.api?.getFocusedIndex()).toBe(0)
    kernel.destroy()
  })

  it('should keep the item being spelled while it still matches the prefix', () => {
    const { kernel, plugin } = setup()

    type('a', 'p')

    expect(plugin.api?.getFocusedIndex()).toBe(0)
    type('r')
    expect(plugin.api?.getFocusedIndex()).toBe(1)
    kernel.destroy()
  })
})

describe('keyboardNav keys that do not use the focus', () => {
  const press = (key: string) => document.body.dispatchEvent(createKeyboardEvent(key))

  function setup(options: Parameters<typeof keyboardNav>[0] = {}) {
    const kernel = createKernel({ itemCount: 100, estimatedItemHeight: 50 })
    const onFocus = vi.fn()
    const onSelect = vi.fn()
    const plugin = keyboardNav({ onFocus, onSelect, ...options })
    kernel.register(plugin)
    return { kernel, plugin, onFocus, onSelect }
  }

  it('should ignore unrelated keys while nothing is focused', () => {
    const { kernel, plugin, onFocus } = setup()
    const scrollToIndex = vi.spyOn(kernel, 'scrollToIndex')

    for (const key of ['Escape', 'Shift', 'F5', 'Tab', 'x']) {
      press(key)
    }

    expect(plugin.api?.getFocusedIndex()).toBeNull()
    expect(onFocus).not.toHaveBeenCalled()
    expect(scrollToIndex).not.toHaveBeenCalled()
    kernel.destroy()
  })

  it('should neither select nor claim Enter and Space while nothing is focused', () => {
    const { kernel, onSelect } = setup()

    for (const key of ['Enter', ' ']) {
      const event = createKeyboardEvent(key)
      document.body.dispatchEvent(event)
      expect(event.defaultPrevented).toBe(false)
    }

    expect(onSelect).not.toHaveBeenCalled()
    kernel.destroy()
  })

  it('should select the focused item on Enter and claim the key', () => {
    const { kernel, plugin, onSelect } = setup()
    plugin.api?.setFocusedIndex(3)

    const event = createKeyboardEvent('Enter')
    document.body.dispatchEvent(event)

    expect(onSelect).toHaveBeenCalledWith(3)
    expect(event.defaultPrevented).toBe(true)
    kernel.destroy()
  })

  it('should start on the first item with ArrowRight in a horizontal list and ArrowDown in a grid', () => {
    const horizontal = setup({ orientation: 'horizontal' })
    press('ArrowRight')
    expect(horizontal.plugin.api?.getFocusedIndex()).toBe(0)
    horizontal.kernel.destroy()

    const grid = setup({ orientation: 'grid', columns: 4 })
    press('ArrowDown')
    expect(grid.plugin.api?.getFocusedIndex()).toBe(0)
    press('ArrowDown')
    expect(grid.plugin.api?.getFocusedIndex()).toBe(4)
    grid.kernel.destroy()
  })
})

describe('keyboardNav created again for the same kernel', () => {
  it('should continue with the focus of the previous instance without announcing it', () => {
    const kernel = createKernel({ itemCount: 20, estimatedItemHeight: 50 })
    const onFocus = vi.fn()
    const first = keyboardNav({ onFocus })
    kernel.register(first)
    first.api?.setFocusedIndex(7)
    kernel.unregister('keyboard-nav')
    onFocus.mockClear()

    const second = keyboardNav({ onFocus })
    kernel.register(second)

    expect(second.api?.getFocusedIndex()).toBe(7)
    expect(onFocus).not.toHaveBeenCalled()
    kernel.destroy()
  })

  it('should start unfocused on another kernel, clamp to a shorter list and keep a cleared focus cleared', () => {
    const kernel = createKernel({ itemCount: 20, estimatedItemHeight: 50 })
    const first = keyboardNav({})
    kernel.register(first)
    first.api?.setFocusedIndex(15)

    const other = createKernel({ itemCount: 20, estimatedItemHeight: 50 })
    const unrelated = keyboardNav({})
    other.register(unrelated)
    expect(unrelated.api?.getFocusedIndex()).toBeNull()

    kernel.unregister('keyboard-nav')
    kernel.configure({ itemCount: 4 })
    const shorter = keyboardNav({})
    kernel.register(shorter)
    expect(shorter.api?.getFocusedIndex()).toBe(3)

    shorter.api?.setFocusedIndex(null)
    kernel.unregister('keyboard-nav')
    const cleared = keyboardNav({})
    kernel.register(cleared)
    expect(cleared.api?.getFocusedIndex()).toBeNull()
    kernel.destroy()
    other.destroy()
  })
})

describe('keyboardNav page keys with loop', () => {
  function focusAfter(loop: boolean, start: number, key: string) {
    const kernel = createKernel({ itemCount: 100, estimatedItemHeight: 50 })
    const plugin = keyboardNav({ loop, pageSize: 10 })
    kernel.register(plugin)
    plugin.api?.setFocusedIndex(start)
    document.body.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true }))
    const focused = plugin.api?.getFocusedIndex()
    kernel.destroy()
    return focused
  }

  it('should clamp PageDown and PageUp at the ends instead of wrapping', () => {
    expect(focusAfter(true, 95, 'PageDown')).toBe(99)
    expect(focusAfter(true, 3, 'PageUp')).toBe(0)
  })

  it('should still wrap single steps (control)', () => {
    expect(focusAfter(true, 99, 'ArrowDown')).toBe(0)
    expect(focusAfter(true, 0, 'ArrowUp')).toBe(99)
  })

  it('should move by a page inside the list', () => {
    expect(focusAfter(true, 20, 'PageDown')).toBe(30)
    expect(focusAfter(false, 95, 'PageDown')).toBe(99)
  })
})
