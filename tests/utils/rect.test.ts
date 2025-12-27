import { vi } from 'vitest'
import {
  getBoundingRect,
  getContentRect,
  getScrollRect,
  getViewport,
  getOffset,
  getPadding,
  getBorder,
  rectsOverlap,
  rectContains,
  getIntersection,
  getVisibilityRatio,
} from '../../src/utils/rect.js'

function createMockElement(options: Partial<{
  clientWidth: number
  clientHeight: number
  scrollWidth: number
  scrollHeight: number
  offsetTop: number
  offsetLeft: number
  paddingTop: string
  paddingRight: string
  paddingBottom: string
  paddingLeft: string
  borderTopWidth: string
  borderRightWidth: string
  borderBottomWidth: string
  borderLeftWidth: string
  boundingRect: DOMRect
}>): HTMLElement {
  const element = document.createElement('div')

  Object.defineProperty(element, 'clientWidth', { value: options.clientWidth ?? 500 })
  Object.defineProperty(element, 'clientHeight', { value: options.clientHeight ?? 400 })
  Object.defineProperty(element, 'scrollWidth', { value: options.scrollWidth ?? 1000 })
  Object.defineProperty(element, 'scrollHeight', { value: options.scrollHeight ?? 800 })
  Object.defineProperty(element, 'offsetTop', { value: options.offsetTop ?? 0 })
  Object.defineProperty(element, 'offsetLeft', { value: options.offsetLeft ?? 0 })

  element.getBoundingClientRect = vi.fn().mockReturnValue(
    options.boundingRect ?? new DOMRect(0, 0, 500, 400)
  )

  const computedStyle = {
    paddingTop: options.paddingTop ?? '0px',
    paddingRight: options.paddingRight ?? '0px',
    paddingBottom: options.paddingBottom ?? '0px',
    paddingLeft: options.paddingLeft ?? '0px',
    borderTopWidth: options.borderTopWidth ?? '0px',
    borderRightWidth: options.borderRightWidth ?? '0px',
    borderBottomWidth: options.borderBottomWidth ?? '0px',
    borderLeftWidth: options.borderLeftWidth ?? '0px',
  }

  vi.spyOn(window, 'getComputedStyle').mockReturnValue(computedStyle as CSSStyleDeclaration)

  return element
}

describe('getBoundingRect', () => {
  it('should return bounding client rect', () => {
    const rect = new DOMRect(10, 20, 100, 200)
    const element = createMockElement({ boundingRect: rect })

    const result = getBoundingRect(element)

    expect(result).toBe(rect)
  })
})

describe('getContentRect', () => {
  it('should return client dimensions', () => {
    const element = createMockElement({ clientWidth: 300, clientHeight: 200 })

    const result = getContentRect(element)

    expect(result).toEqual({ width: 300, height: 200 })
  })
})

describe('getScrollRect', () => {
  it('should return scroll dimensions', () => {
    const element = createMockElement({ scrollWidth: 1500, scrollHeight: 2000 })

    const result = getScrollRect(element)

    expect(result).toEqual({ width: 1500, height: 2000 })
  })
})

describe('getViewport', () => {
  it('should return complete viewport info', () => {
    const element = createMockElement({
      clientWidth: 500,
      clientHeight: 400,
      scrollWidth: 1000,
      scrollHeight: 800,
    })

    const result = getViewport(element)

    expect(result).toEqual({
      width: 500,
      height: 400,
      scrollWidth: 1000,
      scrollHeight: 800,
    })
  })
})

describe('getOffset', () => {
  it('should return offset position', () => {
    const element = createMockElement({ offsetTop: 50, offsetLeft: 100 })

    const result = getOffset(element)

    expect(result).toEqual({ top: 50, left: 100 })
  })
})

describe('getPadding', () => {
  it('should return padding values', () => {
    const element = createMockElement({
      paddingTop: '10px',
      paddingRight: '20px',
      paddingBottom: '15px',
      paddingLeft: '25px',
    })

    const result = getPadding(element)

    expect(result).toEqual({
      top: 10,
      right: 20,
      bottom: 15,
      left: 25,
    })
  })

  it('should handle empty padding values', () => {
    const element = createMockElement({})

    const result = getPadding(element)

    expect(result).toEqual({
      top: 0,
      right: 0,
      bottom: 0,
      left: 0,
    })
  })
})

describe('getBorder', () => {
  it('should return border widths', () => {
    const element = createMockElement({
      borderTopWidth: '1px',
      borderRightWidth: '2px',
      borderBottomWidth: '3px',
      borderLeftWidth: '4px',
    })

    const result = getBorder(element)

    expect(result).toEqual({
      top: 1,
      right: 2,
      bottom: 3,
      left: 4,
    })
  })
})

describe('rectsOverlap', () => {
  it('should return true for overlapping rects', () => {
    const rect1 = new DOMRect(0, 0, 100, 100)
    const rect2 = new DOMRect(50, 50, 100, 100)

    expect(rectsOverlap(rect1, rect2)).toBe(true)
  })

  it('should return false for non-overlapping rects horizontally', () => {
    const rect1 = new DOMRect(0, 0, 100, 100)
    const rect2 = new DOMRect(150, 0, 100, 100)

    expect(rectsOverlap(rect1, rect2)).toBe(false)
  })

  it('should return false for non-overlapping rects vertically', () => {
    const rect1 = new DOMRect(0, 0, 100, 100)
    const rect2 = new DOMRect(0, 150, 100, 100)

    expect(rectsOverlap(rect1, rect2)).toBe(false)
  })

  it('should return true for adjacent rects', () => {
    const rect1 = new DOMRect(0, 0, 100, 100)
    const rect2 = new DOMRect(100, 0, 100, 100)

    expect(rectsOverlap(rect1, rect2)).toBe(true) // Edge touching
  })

  it('should return true for nested rects', () => {
    const outer = new DOMRect(0, 0, 200, 200)
    const inner = new DOMRect(50, 50, 50, 50)

    expect(rectsOverlap(outer, inner)).toBe(true)
  })
})

describe('rectContains', () => {
  it('should return true when inner is fully contained', () => {
    const outer = new DOMRect(0, 0, 200, 200)
    const inner = new DOMRect(50, 50, 50, 50)

    expect(rectContains(inner, outer)).toBe(true)
  })

  it('should return false when inner extends beyond outer', () => {
    const outer = new DOMRect(0, 0, 100, 100)
    const inner = new DOMRect(50, 50, 100, 100)

    expect(rectContains(inner, outer)).toBe(false)
  })

  it('should return true when rects are identical', () => {
    const rect = new DOMRect(0, 0, 100, 100)

    expect(rectContains(rect, rect)).toBe(true)
  })

  it('should return false when inner is completely outside', () => {
    const outer = new DOMRect(0, 0, 100, 100)
    const inner = new DOMRect(200, 200, 50, 50)

    expect(rectContains(inner, outer)).toBe(false)
  })
})

describe('getIntersection', () => {
  it('should return intersection rect for overlapping rects', () => {
    const rect1 = new DOMRect(0, 0, 100, 100)
    const rect2 = new DOMRect(50, 50, 100, 100)

    const result = getIntersection(rect1, rect2)

    expect(result).not.toBeNull()
    expect(result!.left).toBe(50)
    expect(result!.top).toBe(50)
    expect(result!.width).toBe(50)
    expect(result!.height).toBe(50)
  })

  it('should return null for non-overlapping rects', () => {
    const rect1 = new DOMRect(0, 0, 100, 100)
    const rect2 = new DOMRect(200, 200, 100, 100)

    const result = getIntersection(rect1, rect2)

    expect(result).toBeNull()
  })

  it('should return null for touching but non-overlapping rects', () => {
    const rect1 = new DOMRect(0, 0, 100, 100)
    const rect2 = new DOMRect(100, 0, 100, 100)

    const result = getIntersection(rect1, rect2)

    expect(result).toBeNull()
  })

  it('should return inner rect when one contains the other', () => {
    const outer = new DOMRect(0, 0, 200, 200)
    const inner = new DOMRect(50, 50, 50, 50)

    const result = getIntersection(outer, inner)

    expect(result).not.toBeNull()
    expect(result!.left).toBe(50)
    expect(result!.top).toBe(50)
    expect(result!.width).toBe(50)
    expect(result!.height).toBe(50)
  })
})

describe('getVisibilityRatio', () => {
  it('should return 1 for fully visible item', () => {
    const ratio = getVisibilityRatio(100, 200, 0, 500)
    expect(ratio).toBe(1)
  })

  it('should return 0 for completely hidden item', () => {
    const ratio = getVisibilityRatio(600, 700, 0, 500)
    expect(ratio).toBe(0)
  })

  it('should return correct ratio for partially visible item', () => {
    // Item from 450 to 550, viewport from 0 to 500
    // Visible from 450 to 500 = 50px out of 100px = 0.5
    const ratio = getVisibilityRatio(450, 550, 0, 500)
    expect(ratio).toBe(0.5)
  })

  it('should return 0 for zero-height item', () => {
    const ratio = getVisibilityRatio(100, 100, 0, 500)
    expect(ratio).toBe(0)
  })

  it('should handle item that spans entire viewport', () => {
    // Item from 0 to 1000, viewport from 100 to 300
    // Visible = 200px out of 1000px = 0.2
    const ratio = getVisibilityRatio(0, 1000, 100, 300)
    expect(ratio).toBe(0.2)
  })

  it('should return correct ratio for item at top edge', () => {
    // Item from -50 to 50, viewport from 0 to 500
    // Visible from 0 to 50 = 50px out of 100px = 0.5
    const ratio = getVisibilityRatio(-50, 50, 0, 500)
    expect(ratio).toBe(0.5)
  })
})
