import { vi } from 'vitest'
import {
  getScrollPosition,
  setScrollPosition,
  smoothScrollTo,
  isScrollable,
  isScrollableY,
  isScrollableX,
  getMaxScroll,
  getScrollDirection,
  clampScrollPosition,
  isAtTop,
  isAtBottom,
  isAtLeft,
  isAtRight,
} from '../../src/utils/scroll.js'

function createMockElement(options: {
  scrollTop?: number
  scrollLeft?: number
  scrollHeight?: number
  scrollWidth?: number
  clientHeight?: number
  clientWidth?: number
  overflowY?: string
  overflowX?: string
}): HTMLElement {
  const element = document.createElement('div')

  Object.defineProperty(element, 'scrollTop', {
    value: options.scrollTop ?? 0,
    writable: true,
  })
  Object.defineProperty(element, 'scrollLeft', {
    value: options.scrollLeft ?? 0,
    writable: true,
  })
  Object.defineProperty(element, 'scrollHeight', {
    value: options.scrollHeight ?? 1000,
  })
  Object.defineProperty(element, 'scrollWidth', {
    value: options.scrollWidth ?? 1000,
  })
  Object.defineProperty(element, 'clientHeight', {
    value: options.clientHeight ?? 500,
  })
  Object.defineProperty(element, 'clientWidth', {
    value: options.clientWidth ?? 500,
  })

  // Mock getComputedStyle
  const originalGetComputedStyle = window.getComputedStyle
  window.getComputedStyle = vi.fn().mockReturnValue({
    overflowY: options.overflowY ?? 'visible',
    overflowX: options.overflowX ?? 'visible',
  }) as typeof window.getComputedStyle

  // Restore after element is created
  setTimeout(() => {
    window.getComputedStyle = originalGetComputedStyle
  }, 0)

  return element
}

describe('getScrollPosition', () => {
  it('should return current scroll position', () => {
    const element = createMockElement({ scrollTop: 100, scrollLeft: 50 })
    const position = getScrollPosition(element)

    expect(position).toEqual({ scrollTop: 100, scrollLeft: 50 })
  })

  it('should return zero position when not scrolled', () => {
    const element = createMockElement({})
    const position = getScrollPosition(element)

    expect(position).toEqual({ scrollTop: 0, scrollLeft: 0 })
  })
})

describe('setScrollPosition', () => {
  it('should set scrollTop', () => {
    const element = createMockElement({})
    setScrollPosition(element, { scrollTop: 200 })

    expect(element.scrollTop).toBe(200)
  })

  it('should set scrollLeft', () => {
    const element = createMockElement({})
    setScrollPosition(element, { scrollLeft: 150 })

    expect(element.scrollLeft).toBe(150)
  })

  it('should set both positions', () => {
    const element = createMockElement({})
    setScrollPosition(element, { scrollTop: 200, scrollLeft: 150 })

    expect(element.scrollTop).toBe(200)
    expect(element.scrollLeft).toBe(150)
  })

  it('should not change position if not specified', () => {
    const element = createMockElement({ scrollTop: 100, scrollLeft: 50 })
    setScrollPosition(element, {})

    expect(element.scrollTop).toBe(100)
    expect(element.scrollLeft).toBe(50)
  })
})

describe('smoothScrollTo', () => {
  it('should call scrollTo with smooth behavior', () => {
    const element = createMockElement({})

    smoothScrollTo(element, { scrollTop: 300, scrollLeft: 100 })

    expect(element.scrollTo).toHaveBeenCalledWith({
      top: 300,
      left: 100,
      behavior: 'smooth',
    })
  })
})

describe('isScrollable', () => {
  it('should return true for overflow auto', () => {
    const element = createMockElement({ overflowY: 'auto' })
    expect(isScrollable(element)).toBe(true)
  })

  it('should return true for overflow scroll', () => {
    const element = createMockElement({ overflowX: 'scroll' })
    expect(isScrollable(element)).toBe(true)
  })

  it('should return false for overflow visible', () => {
    const element = createMockElement({ overflowY: 'visible', overflowX: 'visible' })
    expect(isScrollable(element)).toBe(false)
  })
})

describe('isScrollableY', () => {
  it('should return true when vertically scrollable', () => {
    const element = createMockElement({
      overflowY: 'auto',
      scrollHeight: 1000,
      clientHeight: 500,
    })
    expect(isScrollableY(element)).toBe(true)
  })

  it('should return false when content fits', () => {
    const element = createMockElement({
      overflowY: 'auto',
      scrollHeight: 500,
      clientHeight: 500,
    })
    expect(isScrollableY(element)).toBe(false)
  })
})

describe('isScrollableX', () => {
  it('should return true when horizontally scrollable', () => {
    const element = createMockElement({
      overflowX: 'scroll',
      scrollWidth: 1000,
      clientWidth: 500,
    })
    expect(isScrollableX(element)).toBe(true)
  })

  it('should return false when content fits', () => {
    const element = createMockElement({
      overflowX: 'scroll',
      scrollWidth: 500,
      clientWidth: 500,
    })
    expect(isScrollableX(element)).toBe(false)
  })
})

describe('getMaxScroll', () => {
  it('should return maximum scroll values', () => {
    const element = createMockElement({
      scrollHeight: 1000,
      scrollWidth: 800,
      clientHeight: 400,
      clientWidth: 300,
    })
    const maxScroll = getMaxScroll(element)

    expect(maxScroll).toEqual({
      scrollTop: 600,
      scrollLeft: 500,
    })
  })

  it('should return zero for non-scrollable content', () => {
    const element = createMockElement({
      scrollHeight: 400,
      scrollWidth: 300,
      clientHeight: 400,
      clientWidth: 300,
    })
    const maxScroll = getMaxScroll(element)

    expect(maxScroll).toEqual({
      scrollTop: 0,
      scrollLeft: 0,
    })
  })
})

describe('getScrollDirection', () => {
  it('should return down when scrolling down', () => {
    const current = { scrollTop: 200, scrollLeft: 0 }
    const previous = { scrollTop: 100, scrollLeft: 0 }

    expect(getScrollDirection(current, previous)).toBe('down')
  })

  it('should return up when scrolling up', () => {
    const current = { scrollTop: 100, scrollLeft: 0 }
    const previous = { scrollTop: 200, scrollLeft: 0 }

    expect(getScrollDirection(current, previous)).toBe('up')
  })

  it('should return right when scrolling right', () => {
    const current = { scrollTop: 0, scrollLeft: 200 }
    const previous = { scrollTop: 0, scrollLeft: 100 }

    expect(getScrollDirection(current, previous)).toBe('right')
  })

  it('should return left when scrolling left', () => {
    const current = { scrollTop: 0, scrollLeft: 100 }
    const previous = { scrollTop: 0, scrollLeft: 200 }

    expect(getScrollDirection(current, previous)).toBe('left')
  })

  it('should return none when not moving', () => {
    const current = { scrollTop: 100, scrollLeft: 100 }
    const previous = { scrollTop: 100, scrollLeft: 100 }

    expect(getScrollDirection(current, previous)).toBe('none')
  })

  it('should prioritize vertical over horizontal', () => {
    const current = { scrollTop: 200, scrollLeft: 150 }
    const previous = { scrollTop: 100, scrollLeft: 100 }

    expect(getScrollDirection(current, previous)).toBe('down')
  })
})

describe('clampScrollPosition', () => {
  it('should clamp to max bounds', () => {
    const element = createMockElement({
      scrollHeight: 1000,
      scrollWidth: 800,
      clientHeight: 400,
      clientWidth: 300,
    })
    const position = { scrollTop: 1000, scrollLeft: 800 }
    const clamped = clampScrollPosition(position, element)

    expect(clamped).toEqual({
      scrollTop: 600,
      scrollLeft: 500,
    })
  })

  it('should clamp to min bounds', () => {
    const element = createMockElement({})
    const position = { scrollTop: -100, scrollLeft: -50 }
    const clamped = clampScrollPosition(position, element)

    expect(clamped).toEqual({
      scrollTop: 0,
      scrollLeft: 0,
    })
  })

  it('should not change valid positions', () => {
    const element = createMockElement({
      scrollHeight: 1000,
      clientHeight: 400,
    })
    const position = { scrollTop: 300, scrollLeft: 0 }
    const clamped = clampScrollPosition(position, element)

    expect(clamped).toEqual({
      scrollTop: 300,
      scrollLeft: 0,
    })
  })
})

describe('isAtTop', () => {
  it('should return true at top', () => {
    const element = createMockElement({ scrollTop: 0 })
    expect(isAtTop(element)).toBe(true)
  })

  it('should return false when scrolled', () => {
    const element = createMockElement({ scrollTop: 100 })
    expect(isAtTop(element)).toBe(false)
  })

  it('should respect threshold', () => {
    const element = createMockElement({ scrollTop: 5 })
    expect(isAtTop(element, 10)).toBe(true)
    expect(isAtTop(element, 3)).toBe(false)
  })
})

describe('isAtBottom', () => {
  it('should return true at bottom', () => {
    const element = createMockElement({
      scrollTop: 500,
      scrollHeight: 1000,
      clientHeight: 500,
    })
    expect(isAtBottom(element)).toBe(true)
  })

  it('should return false when not at bottom', () => {
    const element = createMockElement({
      scrollTop: 100,
      scrollHeight: 1000,
      clientHeight: 500,
    })
    expect(isAtBottom(element)).toBe(false)
  })

  it('should respect threshold', () => {
    const element = createMockElement({
      scrollTop: 495,
      scrollHeight: 1000,
      clientHeight: 500,
    })
    expect(isAtBottom(element, 10)).toBe(true)
    expect(isAtBottom(element, 3)).toBe(false)
  })
})

describe('isAtLeft', () => {
  it('should return true at left', () => {
    const element = createMockElement({ scrollLeft: 0 })
    expect(isAtLeft(element)).toBe(true)
  })

  it('should return false when scrolled right', () => {
    const element = createMockElement({ scrollLeft: 100 })
    expect(isAtLeft(element)).toBe(false)
  })

  it('should respect threshold', () => {
    const element = createMockElement({ scrollLeft: 5 })
    expect(isAtLeft(element, 10)).toBe(true)
  })
})

describe('isAtRight', () => {
  it('should return true at right', () => {
    const element = createMockElement({
      scrollLeft: 500,
      scrollWidth: 1000,
      clientWidth: 500,
    })
    expect(isAtRight(element)).toBe(true)
  })

  it('should return false when not at right', () => {
    const element = createMockElement({
      scrollLeft: 100,
      scrollWidth: 1000,
      clientWidth: 500,
    })
    expect(isAtRight(element)).toBe(false)
  })
})
