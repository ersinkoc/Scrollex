# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

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
- `debugPanelPlugin` - Visual debugging panel with FPS, render count, and memory stats

#### Performance Features
- Zero runtime dependencies (React is peer dependency only)
- Tree-shakeable exports for minimal bundle size (~3KB core)
- Measurement caching for variable heights
- Object pooling to minimize garbage collection
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
- Modern browser support (Chrome 80+, Firefox 75+, Safari 13+, Edge 80+)

---

[Unreleased]: https://github.com/ersinkoc/Scrollex/compare/v1.0.0...HEAD
[1.0.0]: https://github.com/ersinkoc/Scrollex/releases/tag/v1.0.0
