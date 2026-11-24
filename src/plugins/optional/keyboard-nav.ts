import type { Plugin, Kernel } from '../../types.js'

/**
 * Keyboard navigation orientation.
 */
export type KeyboardNavOrientation = 'vertical' | 'horizontal' | 'grid'

/**
 * Keyboard navigation plugin options.
 */
export interface KeyboardNavOptions {
  /** Whether keyboard navigation is enabled */
  enabled?: boolean
  /** Whether to loop around at ends */
  loop?: boolean
  /** Navigation orientation */
  orientation?: KeyboardNavOrientation
  /** Items to skip on PageUp/PageDown */
  pageSize?: number
  /** Number of columns (for grid orientation) */
  columns?: number
  /** Enable type-ahead search */
  typeahead?: boolean
  /** Timeout for type-ahead reset (ms) */
  typeaheadTimeout?: number
  /** Get searchable text for an item */
  getItemText?: (index: number) => string
  /** Callback when focus changes */
  onFocus?: (index: number) => void
  /** Callback when item is selected */
  onSelect?: (index: number) => void
  /** Custom key handler */
  onKeyDown?: (event: KeyboardEvent, focusedIndex: number | null) => boolean | void
}

/**
 * Keyboard navigation plugin API.
 */
export interface KeyboardNavAPI {
  /** Get the currently focused index */
  getFocusedIndex(): number | null
  /** Set the focused index */
  setFocusedIndex(index: number | null): void
  /** Focus the next item */
  focusNext(): void
  /** Focus the previous item */
  focusPrevious(): void
  /** Focus the first item */
  focusFirst(): void
  /** Focus the last item */
  focusLast(): void
  /** Select the focused item */
  selectFocused(): void
  /** Enable keyboard navigation */
  enable(): void
  /** Disable keyboard navigation */
  disable(): void
  /** Check if enabled */
  isEnabled(): boolean
  /** Clear type-ahead buffer */
  clearTypeahead(): void
}

/** The focused index per kernel, shared by the plugin instances that are created for it one after another. */
const focusByKernel = new WeakMap<Kernel, number | null>()

/**
 * Whether a keydown target is a text-editing element whose keys must not be hijacked.
 */
function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false
  if (target.isContentEditable) return true
  const tag = target.tagName
  return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT'
}

/**
 * Creates a keyboard navigation plugin.
 * Provides accessible keyboard navigation for virtualized lists.
 *
 * @param options - Plugin options
 * @returns Plugin instance
 *
 * @example
 * ```tsx
 * import { keyboardNav } from '@oxog/scrollex/plugins'
 *
 * <VirtualList
 *   data={items}
 *   itemHeight={40}
 *   plugins={[keyboardNav({
 *     loop: true,
 *     orientation: 'vertical',
 *     onSelect: (index) => handleSelect(items[index]),
 *   })]}
 *   renderItem={...}
 * />
 * ```
 */
export function keyboardNav(options: KeyboardNavOptions = {}): Plugin {
  const {
    enabled: initialEnabled = true,
    loop = false,
    orientation = 'vertical',
    pageSize = 10,
    columns = 1,
    typeahead = false,
    typeaheadTimeout = 1000,
    getItemText = () => '',
    onFocus,
    onSelect,
    onKeyDown,
  } = options

  let kernel: Kernel | null = null
  let enabled = initialEnabled
  let focusedIndex: number | null = null
  let typeaheadBuffer = ''
  let typeaheadTimer: ReturnType<typeof setTimeout> | null = null

  /**
   * Keep the focus with the kernel, so that a plugin created again for it (an inline
   * `plugins={[keyboardNav(...)]}` is re-installed on every parent render) continues where this one was.
   */
  function rememberFocus(): void {
    if (kernel) focusByKernel.set(kernel, focusedIndex)
  }

  /**
   * Get the item count.
   */
  function getItemCount(): number {
    return kernel?.getItemCount() ?? 0
  }

  /**
   * Clamp index to valid range.
   */
  function clampIndex(index: number): number {
    const count = getItemCount()
    if (count === 0) return 0
    return Math.max(0, Math.min(index, count - 1))
  }

  /**
   * Scroll the focused item into view. A grid publishes its cells to the kernel with an averaged size
   * (rowHeight / columns), so kernel.scrollToIndex would place an item of a lower row by its cell position:
   * the grid case works on rows, whose pitch is the kernel's total size over the number of rows.
   */
  function revealIndex(index: number): void {
    if (!kernel) return
    if (orientation !== 'grid' || columns <= 1) {
      kernel.scrollToIndex(index, { align: 'auto' })
      return
    }

    const rows = Math.ceil(getItemCount() / columns)
    if (rows === 0) return
    const pitch = kernel.getTotalSize() / rows
    const top = Math.floor(index / columns) * pitch
    const bottom = top + pitch
    const viewportHeight = kernel.getViewport().height
    const scrollTop = kernel.getScrollPosition().scrollTop

    if (top < scrollTop) {
      kernel.scrollTo(top)
    } else if (bottom > scrollTop + viewportHeight) {
      kernel.scrollTo(bottom - viewportHeight)
    }
  }

  /**
   * Set focused index with bounds checking.
   */
  function setFocus(index: number | null, wrap = true): void {
    if (index === null) {
      focusedIndex = null
      rememberFocus()
      return
    }

    const count = getItemCount()
    if (count === 0) {
      focusedIndex = null
      rememberFocus()
      return
    }

    let newIndex = index

    if (loop && wrap) {
      // Wrap around (single steps only: page jumps stop at the ends)
      if (newIndex < 0) {
        newIndex = count - 1
      } else if (newIndex >= count) {
        newIndex = 0
      }
    } else {
      // Clamp
      newIndex = clampIndex(newIndex)
    }

    if (newIndex !== focusedIndex) {
      focusedIndex = newIndex
      rememberFocus()
      onFocus?.(newIndex)

      // Scroll focused item into view
      revealIndex(newIndex)
    }
  }

  /**
   * Handle keyboard events.
   */
  function handleKeyDown(event: KeyboardEvent): void {
    if (!enabled || !kernel) return

    // The listener is document-wide; leave typing in form fields alone
    if (isEditableTarget(event.target)) return

    // Call custom handler first
    if (onKeyDown) {
      const handled = onKeyDown(event, focusedIndex)
      if (handled === true) {
        event.preventDefault()
        return
      }
    }

    // Alt / Ctrl / Meta combinations belong to the browser and the OS (Alt+Left = back, Ctrl+Home = page top)
    if (event.altKey || event.ctrlKey || event.metaKey) return

    const count = getItemCount()
    if (count === 0) return

    // Type-ahead needs to know whether anything was focused before this key
    const focusBeforeKey = focusedIndex

    // Only keys that act on the focus start it: with nothing focused, moving forward lands on the first item
    switch (event.key) {
      case 'ArrowDown':
        if (orientation === 'vertical' || orientation === 'grid') {
          event.preventDefault()
          if (focusedIndex === null) {
            setFocus(0)
          } else {
            setFocus(focusedIndex + (orientation === 'grid' ? columns : 1))
          }
        }
        break

      case 'ArrowUp':
        if (orientation === 'vertical' || orientation === 'grid') {
          event.preventDefault()
          if (orientation === 'grid') {
            setFocus((focusedIndex ?? 0) - columns)
          } else {
            setFocus((focusedIndex ?? 0) - 1)
          }
        }
        break

      case 'ArrowRight':
        if (orientation === 'horizontal' || orientation === 'grid') {
          event.preventDefault()
          setFocus(focusedIndex === null ? 0 : focusedIndex + 1)
        }
        break

      case 'ArrowLeft':
        if (orientation === 'horizontal' || orientation === 'grid') {
          event.preventDefault()
          setFocus((focusedIndex ?? 0) - 1)
        }
        break

      case 'Home':
        event.preventDefault()
        setFocus(0)
        break

      case 'End':
        event.preventDefault()
        setFocus(count - 1)
        break

      case 'PageUp':
        event.preventDefault()
        setFocus((focusedIndex ?? 0) - pageSize, false)
        break

      case 'PageDown':
        event.preventDefault()
        setFocus((focusedIndex ?? 0) + pageSize, false)
        break

      case 'Enter':
      case ' ':
        // Nothing focused: the key is not ours (Space scrolls the page, Enter activates buttons)
        if (focusedIndex !== null) {
          event.preventDefault()
          onSelect?.(focusedIndex)
        }
        break

      default:
        // Type-ahead search
        if (typeahead && event.key.length === 1 && !event.ctrlKey && !event.metaKey) {
          event.preventDefault()
          handleTypeahead(event.key, focusBeforeKey)
        }
        break
    }
  }

  /**
   * Handle type-ahead search.
   */
  function handleTypeahead(char: string, focusBeforeKey: number | null): void {
    if (!kernel) return

    // Clear previous timer
    if (typeaheadTimer) {
      clearTimeout(typeaheadTimer)
    }

    // Add to buffer
    typeaheadBuffer += char.toLowerCase()

    // Search for matching item
    const count = getItemCount()
    // A new search starts after the focused item (first item when nothing was focused); a longer
    // prefix keeps the focused item as long as it still matches
    const startIndex = typeaheadBuffer.length > 1
      ? (focusedIndex ?? 0)
      : focusBeforeKey !== null ? focusBeforeKey + 1 : 0

    for (let i = 0; i < count; i++) {
      const index = (startIndex + i) % count
      const text = getItemText(index).toLowerCase()

      if (text.startsWith(typeaheadBuffer)) {
        setFocus(index)
        break
      }
    }

    // Set timer to clear buffer
    typeaheadTimer = setTimeout(() => {
      typeaheadBuffer = ''
      typeaheadTimer = null
    }, typeaheadTimeout)
  }

  const api: KeyboardNavAPI = {
    getFocusedIndex(): number | null {
      return focusedIndex
    },

    setFocusedIndex(index: number | null): void {
      setFocus(index)
    },

    focusNext(): void {
      if (orientation === 'grid') {
        setFocus((focusedIndex ?? -1) + columns)
      } else {
        setFocus((focusedIndex ?? -1) + 1)
      }
    },

    focusPrevious(): void {
      if (orientation === 'grid') {
        setFocus((focusedIndex ?? getItemCount()) - columns)
      } else {
        setFocus((focusedIndex ?? getItemCount()) - 1)
      }
    },

    focusFirst(): void {
      setFocus(0)
    },

    focusLast(): void {
      setFocus(getItemCount() - 1)
    },

    selectFocused(): void {
      if (focusedIndex !== null) {
        onSelect?.(focusedIndex)
      }
    },

    enable(): void {
      enabled = true
    },

    disable(): void {
      enabled = false
    },

    isEnabled(): boolean {
      return enabled
    },

    clearTypeahead(): void {
      typeaheadBuffer = ''
      if (typeaheadTimer) {
        clearTimeout(typeaheadTimer)
        typeaheadTimer = null
      }
    },
  }

  return {
    name: 'keyboard-nav',
    version: '1.0.0',
    type: 'optional',

    install(k: Kernel): void {
      kernel = k

      // Continue with the focus of a previous instance for this kernel (kept while the list shrinks)
      const remembered = focusByKernel.get(k) ?? null
      const count = k.getItemCount()
      focusedIndex = remembered === null || count === 0 ? null : Math.min(remembered, count - 1)

      // Add keyboard listener to document
      // Note: In a real implementation, this should be scoped to the container
      document.addEventListener('keydown', handleKeyDown)
    },

    uninstall(): void {
      document.removeEventListener('keydown', handleKeyDown)

      if (typeaheadTimer) {
        clearTimeout(typeaheadTimer)
      }

      focusedIndex = null
      typeaheadBuffer = ''
      kernel = null
    },

    hooks: {
      onItemsChange: () => {
        // Ensure focused index is still valid
        if (focusedIndex !== null) {
          const count = getItemCount()
          if (focusedIndex >= count) {
            setFocus(count > 0 ? count - 1 : null)
          }
        }
      },
    },

    api,
  }
}
