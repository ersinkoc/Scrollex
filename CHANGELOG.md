# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [1.0.1] - 2026-11-24

### Changed
- `Range.endIndex` is now the last item that is at least partly inside the viewport (inclusive, as documented). It used to be one past it, so a row starting exactly at the edge counted as visible.
- `useVirtualList` / `createKernel` accept `paddingStart` (`KernelOptions.paddingStart`); `initialScrollOffset` is applied once on mount.
- `keyboardNav`: with nothing focused, `ArrowDown` / `ArrowRight` focus the first item and other keys no longer move the focus; `Enter` / `Space` only act on a focused item.
- `VirtualList` ARIA: options carry `aria-setsize` / `aria-posinset` (the position among all items) instead of the unsupported `aria-rowcount` / `aria-rowindex`; a horizontal list exposes `aria-orientation="horizontal"`.
- `DragHandleProps` handlers are typed with the new `DragEventLike` so they can be spread on React elements; `UseMeasureOptions`, `UseMeasureReturn` and `DragEventLike` are exported.

### Fixed
- Hooks: `virtualItems` never contains items beyond the data in the render where the data shrinks (`items[virtualItem.index]` no longer throws).
- A smooth scroll keeps running when a masonry's items, columns or gap change.
- Item counts: measurements of removed items are dropped when the list shrinks; `measureItem` ignores invalid sizes and indices; entries that are `undefined` are rendered like any other item.
- Plugins created inline on every render (`plugins={[...]}`) keep their state per list: `infiniteLoaderPlugin` (load in flight), `keyboardNav` (focus), `dragToReorder` (drag in progress), `bidirectional` / `scrollRestoration` (one-time actions).
- Infinite loading: horizontal lists measure the end along their own axis, and a list that does not fill its viewport asks for more data.
- Grid: `aria-rowcount` is right right after mounting and after count changes; `overscan` changes take effect.
- Scroll engine: negative or non-finite animation durations scroll instantly; the position cache follows the clamped scroll position.
- Debug panel counts and percentage, masonry row visibility, `useMeasureMany` observation and several documentation samples were corrected.
- `keyboardNav`: `PageUp` / `PageDown` stop at the ends with `loop` on (arrow keys still wrap), and in a grid the focused item's whole row is scrolled into view.
- `scrollRestoration` restores the position of a new `key` on a list that stays mounted; `EventBus` once-handlers follow the same dispatch snapshot as other handlers.
- Layout inputs: `columns` that is not a positive whole number (0, a fraction, NaN) and `overscan` that is NaN or negative no longer break or empty the list/grid/masonry; a masonry item with a non-finite height no longer poisons the layout.
- Website: icon-only controls in the header and footer have accessible names.
- `columns="auto"` with an unusable `minColumnWidth` (0, negative, NaN) lays out one column instead of crashing the masonry / emptying the grid; `stickyHeaders` follows the axis of a horizontal list; masonry column heights end at each column's last item (no trailing gap) and the renderer reports an empty layout once uninstalled.
- `kernel.getScrollPosition()` now fills `offset` (position along the list's axis) and `percentage` (0-1); the debug panel's viewport overlay and item boundaries switches are documented as not implemented.
- Horizontal lists: `infiniteLoaderPlugin`, `autoMeasurerPlugin` and `bidirectional` follow the list's own axis (`scrollLeft` / width) instead of `scrollTop` / height.
- `infiniteLoaderPlugin` loads for a list that fits its viewport (it looks once at install); `scrollRestoration` waits for data that arrives after mount and no longer overwrites the saved position; `initialScrollOffset` also works when the list is empty at mount.
- Scroll events of programmatic scrolls carry their delta and direction; a smooth scroll never starts backward (its first frame can precede the start time).
- Grid and masonry size their columns from the content box of a padded container; `useVirtualGrid` no longer accepts list-only options it ignores (`estimatedItemHeight`, `horizontal`, `paddingStart`, `paddingEnd`, `scrollMargin`); `GridRendererOptions.getContainerWidth` is new.
- `infiniteLoaderPlugin`'s `reset()` drops the check its debounce window queued for the data being replaced, so a reset list no longer loads for the position it had in the old data.
- Removing items rebuilds the measured count and size sum from the entries that remain: a shifted measurement that lands on an index that is still measured no longer leaves both overstated.
- A programmatic scroll stopped from inside a frame (a host that reports the scroll synchronously) really ends: the running frame neither schedules another one nor clears the state of a newer animation.
- `autoMeasurerPlugin` drops an element's previous index when it is observed for a new one, so an element reused for another row is no longer measured under its stale index.
- `useLoadMoreWhenShort` handles a rejected `onLoadMore()` (logged as `[Scrollex] Error in onLoadMore:`) instead of leaving an unhandled rejection.

## [1.0.0] - 2025-12-27

### Added

#### Core Components
- `VirtualList` - High-performance virtualized list component with fixed and variable heights
- `VirtualGrid` - Multi-column grid virtualization with gap support
- `VirtualMasonry` - Pinterest-style masonry layout with dynamic columns

#### React Hooks
- `useVirtualList` - Hook for custom list virtualization
- `useVirtualGrid` - Hook for custom grid virtualization
- `useVirtualMasonry` - Hook for custom masonry layouts
- `useMeasure` - Hook for measuring element dimensions
- `useMeasureMany` - Hook for batch element measurement
- `useScrollex` - Context hook for accessing kernel instance

#### Micro-Kernel Architecture
- Event-driven kernel with typed event system
- Plugin registry with dependency resolution
- Binary search for O(log n) visible range calculation
- RAF-throttled scroll handling for smooth 60fps rendering
- Configurable viewport management

#### Core Plugins
- `listRendererPlugin` - Core list rendering with positioning
- `gridRendererPlugin` - Grid layout calculations and rendering
- `autoMeasurerPlugin` - Automatic height measurement with ResizeObserver
- `infiniteLoaderPlugin` - Bidirectional infinite scroll with debouncing
- `scrollControllerPlugin` - Programmatic scroll control with easing functions

#### Optional Plugins
- `debugPanel` - Visual debugging panel with FPS, render count, and memory stats

#### Performance Features
- Zero runtime dependencies (React is peer dependency only)
- Tree-shakeable exports for minimal bundle size (~5KB core)
- Measurement caching for variable heights
- CSS containment support for rendering optimization
- Overscan configuration for smooth scrolling

#### Developer Experience
- Full TypeScript support with strict mode
- Comprehensive type definitions for all APIs
- ESM and CJS dual package exports
- Source maps included for debugging
- 71%+ test coverage with Vitest

### Technical Details
- Tested with 100,000+ items at consistent 60fps
- Supports React 17.0.0 and above
- Node.js 18.0.0+ required for development
- Modern browser support (Chrome 80+, Firefox 75+, Safari 13.1+, Edge 80+)

---

[Unreleased]: https://github.com/ersinkoc/Scrollex/compare/v1.0.1...HEAD
[1.0.1]: https://github.com/ersinkoc/Scrollex/compare/v1.0.0...v1.0.1
[1.0.0]: https://github.com/ersinkoc/Scrollex/releases/tag/v1.0.0
