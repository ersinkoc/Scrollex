import { vi } from 'vitest'
import { renderHook } from '@testing-library/react'
import React from 'react'
import { ScrollexContext, useScrollex, useScrollexRequired } from '../../src/react/context.js'
import type { Kernel } from '../../src/types.js'

// Create mock kernel
function createMockKernel(): Kernel {
  return {
    configure: vi.fn(),
    attach: vi.fn(),
    detach: vi.fn(),
    destroy: vi.fn(),
    getScrollPosition: vi.fn(() => ({ scrollTop: 0, scrollLeft: 0 })),
    setScrollPosition: vi.fn(),
    getViewport: vi.fn(() => ({ top: 0, left: 0, width: 400, height: 600, bottom: 600, right: 400 })),
    getVisibleRange: vi.fn(() => ({ startIndex: 0, endIndex: 10, overscanStartIndex: 0, overscanEndIndex: 10 })),
    getRenderRange: vi.fn(() => ({ startIndex: 0, endIndex: 10, overscanStartIndex: 0, overscanEndIndex: 10 })),
    getTotalSize: vi.fn(() => 5000),
    scrollTo: vi.fn(),
    scrollToIndex: vi.fn(),
    measureItem: vi.fn(),
    getCachedHeight: vi.fn(),
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
    hasPlugin: vi.fn(() => false),
    getItemOffset: vi.fn((index: number) => index * 50),
    getItemCount: vi.fn(() => 100),
  } as unknown as Kernel
}

describe('ScrollexContext', () => {
  it('should have null as default value', () => {
    const { result } = renderHook(() => useScrollex())
    expect(result.current).toBeNull()
  })
})

describe('useScrollex', () => {
  it('should return null when not in a provider', () => {
    const { result } = renderHook(() => useScrollex())
    expect(result.current).toBeNull()
  })

  it('should return kernel when in a provider', () => {
    const mockKernel = createMockKernel()

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <ScrollexContext.Provider value={{ kernel: mockKernel }}>
        {children}
      </ScrollexContext.Provider>
    )

    const { result } = renderHook(() => useScrollex(), { wrapper })
    expect(result.current).toBe(mockKernel)
  })

  it('should allow using kernel methods', () => {
    const mockKernel = createMockKernel()

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <ScrollexContext.Provider value={{ kernel: mockKernel }}>
        {children}
      </ScrollexContext.Provider>
    )

    const { result } = renderHook(() => useScrollex(), { wrapper })

    result.current?.scrollTo(500)
    expect(mockKernel.scrollTo).toHaveBeenCalledWith(500)
  })
})

describe('useScrollexRequired', () => {
  it('should throw when not in a provider', () => {
    expect(() => {
      renderHook(() => useScrollexRequired())
    }).toThrow('[Scrollex] useScrollexRequired must be used within a Scrollex component')
  })

  it('should return kernel when in a provider', () => {
    const mockKernel = createMockKernel()

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <ScrollexContext.Provider value={{ kernel: mockKernel }}>
        {children}
      </ScrollexContext.Provider>
    )

    const { result } = renderHook(() => useScrollexRequired(), { wrapper })
    expect(result.current).toBe(mockKernel)
  })

  it('should allow using kernel methods', () => {
    const mockKernel = createMockKernel()

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <ScrollexContext.Provider value={{ kernel: mockKernel }}>
        {children}
      </ScrollexContext.Provider>
    )

    const { result } = renderHook(() => useScrollexRequired(), { wrapper })

    result.current.scrollToIndex(10, { align: 'center', behavior: 'smooth' })
    expect(mockKernel.scrollToIndex).toHaveBeenCalledWith(10, { align: 'center', behavior: 'smooth' })
  })
})
