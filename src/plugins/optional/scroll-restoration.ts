import type { Plugin, Kernel, ScrollPosition, ScrollEvent } from '../../types.js'
import { debounce } from '../../utils/debounce.js'

/**
 * Storage interface for scroll restoration.
 */
export interface ScrollRestorationStorage {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
  removeItem(key: string): void
}

/**
 * Saved scroll state.
 */
export interface SavedScrollState {
  scrollTop: number
  scrollLeft: number
  focusedIndex?: number
  timestamp: number
}

/**
 * Scroll restoration plugin options.
 */
export interface ScrollRestorationOptions {
  /** Unique key for storage */
  key: string
  /** Storage type or custom storage */
  storage?: 'sessionStorage' | 'localStorage' | ScrollRestorationStorage
  /** Restore scroll position on mount */
  restoreOnMount?: boolean
  /** Save scroll position on unmount */
  saveOnUnmount?: boolean
  /** Save scroll position while scrolling (debounced) */
  saveOnScroll?: boolean
  /** Debounce time for save on scroll (ms) */
  debounceMs?: number
  /** Include focused index in saved state */
  includeIndex?: boolean
  /** Maximum age of saved state (ms), 0 = no expiry */
  maxAge?: number
}

/**
 * Scroll restoration plugin API.
 */
export interface ScrollRestorationAPI {
  /** Save current scroll position */
  save(): void
  /** Restore saved scroll position */
  restore(): boolean
  /** Clear saved scroll position */
  clear(): void
  /** Get saved position without restoring */
  getSavedPosition(): SavedScrollState | null
  /** Check if there's a saved position */
  hasSavedPosition(): boolean
}

/**
 * Creates a scroll restoration plugin.
 * Saves and restores scroll position across sessions.
 *
 * @param options - Plugin options
 * @returns Plugin instance
 *
 * @example
 * ```tsx
 * import { scrollRestoration } from '@oxog/scrollex/plugins'
 *
 * <VirtualList
 *   data={items}
 *   plugins={[scrollRestoration({
 *     key: 'my-list',
 *     storage: 'sessionStorage',
 *     restoreOnMount: true,
 *     saveOnUnmount: true,
 *   })]}
 *   renderItem={...}
 * />
 * ```
 */
export function scrollRestoration(options: ScrollRestorationOptions): Plugin {
  const {
    key,
    storage = 'sessionStorage',
    restoreOnMount = true,
    saveOnUnmount = true,
    saveOnScroll = false,
    debounceMs = 500,
    includeIndex = false,
    maxAge = 0,
  } = options

  let kernel: Kernel | null = null
  let debouncedSave: ReturnType<typeof debounce> | null = null

  /**
   * Get storage instance.
   */
  function getStorage(): ScrollRestorationStorage {
    if (typeof storage === 'string') {
      if (storage === 'sessionStorage') {
        return sessionStorage
      }
      return localStorage
    }
    return storage
  }

  /**
   * Get the storage key with prefix.
   */
  function getStorageKey(): string {
    return `scrollex:${key}`
  }

  /**
   * Save current scroll state.
   */
  function save(): void {
    if (!kernel) return

    const scrollPosition = kernel.getScrollPosition()

    const state: SavedScrollState = {
      scrollTop: scrollPosition.scrollTop,
      scrollLeft: scrollPosition.scrollLeft,
      timestamp: Date.now(),
    }

    // Include focused index if requested
    if (includeIndex) {
      const keyboardNav = kernel.getPlugin<Plugin & { api: { getFocusedIndex(): number | null } }>('keyboard-nav')
      if (keyboardNav?.api?.getFocusedIndex) {
        const focusedIndex = keyboardNav.api.getFocusedIndex()
        if (focusedIndex !== null) {
          state.focusedIndex = focusedIndex
        }
      }
    }

    try {
      getStorage().setItem(getStorageKey(), JSON.stringify(state))
    } catch (error) {
      console.warn('[Scrollex] Failed to save scroll position:', error)
    }
  }

  /**
   * Get saved scroll state.
   */
  function getSavedState(): SavedScrollState | null {
    try {
      const stored = getStorage().getItem(getStorageKey())
      if (!stored) return null

      const state = JSON.parse(stored) as SavedScrollState

      // Check if expired
      if (maxAge > 0) {
        const age = Date.now() - state.timestamp
        if (age > maxAge) {
          clear()
          return null
        }
      }

      return state
    } catch {
      return null
    }
  }

  /**
   * Restore saved scroll position.
   */
  function restore(): boolean {
    if (!kernel) return false

    const state = getSavedState()
    if (!state) return false

    // Restore scroll position
    kernel.scrollTo(state.scrollTop)

    // Restore focused index if available
    if (includeIndex && state.focusedIndex !== undefined) {
      const keyboardNav = kernel.getPlugin<Plugin & { api: { setFocusedIndex(index: number | null): void } }>('keyboard-nav')
      if (keyboardNav?.api?.setFocusedIndex) {
        keyboardNav.api.setFocusedIndex(state.focusedIndex)
      }
    }

    return true
  }

  /**
   * Clear saved scroll position.
   */
  function clear(): void {
    try {
      getStorage().removeItem(getStorageKey())
    } catch (error) {
      console.warn('[Scrollex] Failed to clear scroll position:', error)
    }
  }

  /**
   * Handle scroll event for saving.
   */
  function handleScroll(_event: ScrollEvent): void {
    if (saveOnScroll && debouncedSave) {
      debouncedSave()
    }
  }

  const api: ScrollRestorationAPI = {
    save,
    restore,
    clear,

    getSavedPosition(): SavedScrollState | null {
      return getSavedState()
    },

    hasSavedPosition(): boolean {
      return getSavedState() !== null
    },
  }

  return {
    name: 'scroll-restoration',
    version: '1.0.0',
    type: 'optional',

    install(k: Kernel): void {
      kernel = k

      // Create debounced save if needed
      if (saveOnScroll) {
        debouncedSave = debounce(save, debounceMs)
      }

      // Restore on mount
      if (restoreOnMount) {
        // Delay restore slightly to ensure container is ready
        requestAnimationFrame(() => {
          restore()
        })
      }
    },

    uninstall(): void {
      // Save on unmount
      if (saveOnUnmount) {
        save()
      }

      if (debouncedSave) {
        debouncedSave.cancel()
        debouncedSave = null
      }

      kernel = null
    },

    hooks: {
      onScroll: handleScroll,
    },

    api,
  }
}
