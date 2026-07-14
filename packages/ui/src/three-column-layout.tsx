import * as React from 'react'
import { Slot } from '@radix-ui/react-slot'
import { cn } from './utils'

export interface ThreeColumnLayoutProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Left sidebar width class (default: w-[280px]) */
  sidebarWidth?: string
  /** Article list width class (default: w-[320px]) */
  listWidth?: string
  /** Whether to show resize handles */
  resizable?: boolean
}

const ThreeColumnLayout = React.forwardRef<HTMLDivElement, ThreeColumnLayoutProps>(
  (
    { className, sidebarWidth = 'w-[280px]', listWidth = 'w-[320px]', resizable = false, ...props },
    ref,
  ) => {
    return (
      <div
        ref={ref}
        className={cn('flex h-screen overflow-hidden', resizable && 'resize-x', className)}
        {...props}
      />
    )
  },
)
ThreeColumnLayout.displayName = 'ThreeColumnLayout'

export interface SidebarProps extends React.HTMLAttributes<HTMLElement> {
  asChild?: boolean
}

const Sidebar = React.forwardRef<HTMLElement, SidebarProps>(
  ({ className, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : 'aside'
    return (
      <Comp
        ref={ref as React.Ref<HTMLElement>}
        className={cn('flex-shrink-0 border-r bg-background overflow-y-auto', className)}
        {...props}
      />
    )
  },
)
Sidebar.displayName = 'Sidebar'

export interface ArticleListProps extends React.HTMLAttributes<HTMLElement> {
  asChild?: boolean
}

const ArticleList = React.forwardRef<HTMLElement, ArticleListProps>(
  ({ className, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : 'div'
    return (
      <Comp
        ref={ref as React.Ref<HTMLElement>}
        className={cn('flex-shrink-0 border-r bg-background overflow-y-auto', className)}
        {...props}
      />
    )
  },
)
ArticleList.displayName = 'ArticleList'

export interface ReaderProps extends React.HTMLAttributes<HTMLElement> {
  asChild?: boolean
}

const Reader = React.forwardRef<HTMLElement, ReaderProps>(
  ({ className, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : 'main'
    return (
      <Comp
        ref={ref as React.Ref<HTMLElement>}
        className={cn('flex-1 bg-background overflow-y-auto', className)}
        {...props}
      />
    )
  },
)
Reader.displayName = 'Reader'

/**
 * ThreeColumnLayout with preset widths for classic RSS reader experience
 * Uses Flexbox with CSS Grid-like fixed widths for predictable column sizing
 */
const ClassicThreeColumnLayout = React.forwardRef<HTMLDivElement, ThreeColumnLayoutProps>(
  ({ className, children, ...props }, ref) => {
    return (
      <ThreeColumnLayout ref={ref} className={cn('flex-row', className)} {...props}>
        {React.Children.map(children, (child, index) => {
          if (!React.isValidElement(child)) return child
          const isFirst = index === 0
          const isSecond = index === 1
          return React.cloneElement(child as React.ReactElement<{ className?: string }>, {
            className: cn(
              isFirst && 'w-[280px] flex-shrink-0',
              isSecond && 'w-[320px] flex-shrink-0',
              (child.props as { className?: string }).className,
            ),
          })
        })}
      </ThreeColumnLayout>
    )
  },
)
ClassicThreeColumnLayout.displayName = 'ClassicThreeColumnLayout'

/**
 * Compact variant with narrower sidebar
 */
const CompactThreeColumnLayout = React.forwardRef<HTMLDivElement, ThreeColumnLayoutProps>(
  ({ className, ...props }, ref) => {
    return (
      <ThreeColumnLayout
        ref={ref}
        className={cn('grid grid-cols-[220px_280px_1fr]', className)}
        {...props}
      />
    )
  },
)
CompactThreeColumnLayout.displayName = 'CompactThreeColumnLayout'

/**
 * Wide variant with wider article list
 */
const WideThreeColumnLayout = React.forwardRef<HTMLDivElement, ThreeColumnLayoutProps>(
  ({ className, ...props }, ref) => {
    return (
      <ThreeColumnLayout
        ref={ref}
        className={cn('grid grid-cols-[280px_400px_1fr]', className)}
        {...props}
      />
    )
  },
)
WideThreeColumnLayout.displayName = 'WideThreeColumnLayout'

/**
 * Folio-specific three-column layout using CSS Grid (264/392/1fr).
 * Uses .folio-app class for responsive behavior (defined in apps/web/src/app.css).
 *
 * NOTE: 故意不用 cn() 包装 className —— tailwind-merge 会移除不在 Tailwind
 * utility 白名单中的 CSS class（如 .folio-app），导致 grid 布局失效。
 * 直接拼接 className 保留所有自定义类。
 */
const FolioThreeColumnLayout = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, children, ...props }, ref) => {
  const merged = ['folio-app', className].filter(Boolean).join(' ')
  return (
    <div ref={ref} className={merged} {...props}>
      {children}
    </div>
  )
})
FolioThreeColumnLayout.displayName = 'FolioThreeColumnLayout'

export {
  ThreeColumnLayout,
  Sidebar,
  ArticleList,
  Reader,
  ClassicThreeColumnLayout,
  CompactThreeColumnLayout,
  WideThreeColumnLayout,
  FolioThreeColumnLayout,
}
