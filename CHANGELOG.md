# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [1.0.0] - 2024-XX-XX

### Added
- Initial release
- `VirtualList` component for virtualized list rendering
- `VirtualGrid` component for multi-column grid virtualization
- `VirtualMasonry` component for Pinterest-style masonry layouts
- `useVirtualList` hook for headless list virtualization
- `useVirtualGrid` hook for headless grid virtualization
- `useVirtualMasonry` hook for headless masonry virtualization
- `useScrollex` hook for kernel access
- Core plugins:
  - `list-renderer` - Core list virtualization
  - `grid-renderer` - Grid layout support
  - `auto-measurer` - Dynamic height measurement
  - `infinite-loader` - Infinite scroll detection
  - `scroll-controller` - Programmatic scroll control
- Optional plugins:
  - `masonryRenderer` - Masonry layout algorithm
  - `stickyHeaders` - Sticky group headers
  - `keyboardNav` - Keyboard navigation
  - `scrollRestoration` - Scroll position persistence
  - `bidirectional` - Chat-style bidirectional scroll
  - `dragToReorder` - Drag and drop reordering
  - `debugPanel` - Visual debugging tools
- Full TypeScript support with strict mode
- 100% test coverage
- Zero runtime dependencies
