// React Components
export { VirtualList } from './react/components/virtual-list.js'
export { VirtualGrid } from './react/components/virtual-grid.js'
export { VirtualMasonry } from './react/components/virtual-masonry.js'

// React Hooks
export { useVirtualList } from './react/hooks/use-virtual-list.js'
export { useVirtualGrid } from './react/hooks/use-virtual-grid.js'
export { useVirtualMasonry } from './react/hooks/use-virtual-masonry.js'
export { useMeasure, useMeasureMany } from './react/hooks/use-measure.js'
export { useScrollex, useScrollexRequired } from './react/context.js'

// Kernel
export { createKernel, createPlugin } from './kernel/kernel.js'
export { easings } from './kernel/scroll-engine.js'

// Core Plugins
export { listRendererPlugin } from './plugins/core/list-renderer.js'
export { gridRendererPlugin } from './plugins/core/grid-renderer.js'
export { autoMeasurerPlugin } from './plugins/core/auto-measurer.js'
export { infiniteLoaderPlugin } from './plugins/core/infinite-loader.js'
export { scrollControllerPlugin } from './plugins/core/scroll-controller.js'

// Types
export type {
  // Core types
  VirtualItem,
  Range,
  ScrollPosition,
  Viewport,
  ScrollDirection,
  ScrollBehavior,
  ScrollAlignment,

  // Event types
  EventType,
  KernelEvent,
  ScrollEvent,
  ScrollStartEvent,
  ScrollEndEvent,
  VisibleRangeChangeEvent,
  ItemMeasuredEvent,
  ResizeEvent,
  LoadMoreEvent,
  ItemsChangeEvent,
  EventHandler,
  Unsubscribe,

  // Scroll options
  ScrollOptions,
  ScrollToIndexOptions,
  EasingFunction,

  // Plugin types
  Plugin,
  PluginType,
  PluginHooks,
  PluginInfo,
  PluginConfig,

  // Kernel types
  Kernel,
  KernelOptions,

  // React component props
  RenderItemProps,
  GridRenderItemProps,
  MasonryRenderItemProps,
  ItemsRenderedInfo,
  VirtualListProps,
  VirtualGridProps,
  VirtualMasonryProps,
  GridGap,
  VirtualListHandle,

  // Hook types
  UseVirtualListOptions,
  UseVirtualListReturn,
  UseVirtualGridOptions,
  UseVirtualGridReturn,
  UseVirtualMasonryOptions,
  UseVirtualMasonryReturn,
} from './types.js'

// Core plugin types
export type {
  ListRendererOptions,
  ListRendererAPI,
} from './plugins/core/list-renderer.js'
export type {
  GridRendererOptions,
  GridRendererAPI,
} from './plugins/core/grid-renderer.js'
export type {
  AutoMeasurerOptions,
  AutoMeasurerAPI,
} from './plugins/core/auto-measurer.js'
export type {
  InfiniteLoaderOptions,
  InfiniteLoaderAPI,
  LoadDirection,
} from './plugins/core/infinite-loader.js'
export type {
  ScrollControllerOptions,
  ScrollControllerAPI,
} from './plugins/core/scroll-controller.js'
