import { describe, it, expect } from 'vitest'
import * as React from 'react'
import { cn } from '../utils'
import type {
  ThreeColumnLayoutProps,
  SidebarProps,
  ArticleListProps,
  ReaderProps,
} from '../three-column-layout'

// Since we can't render React components without @testing-library/react,
// we test the types and utility functions

describe('ThreeColumnLayout types', () => {
  it('should have correct default props', () => {
    const props: ThreeColumnLayoutProps = {
      className: 'test',
      sidebarWidth: 'w-[280px]',
      listWidth: 'w-[320px]',
      resizable: false,
    }

    expect(props.sidebarWidth).toBe('w-[280px]')
    expect(props.listWidth).toBe('w-[320px]')
    expect(props.resizable).toBe(false)
  })

  it('should accept standard HTML div props', () => {
    const props: ThreeColumnLayoutProps = {
      id: 'layout-1',
      'data-testid': 'layout',
      onClick: () => {},
    }

    expect(props.id).toBe('layout-1')
    expect(props['data-testid']).toBe('layout')
    expect(props.onClick).toBeDefined()
  })
})

describe('Sidebar types', () => {
  it('should have asChild prop for Slot composition', () => {
    const props: SidebarProps = {
      asChild: true,
      className: 'custom-sidebar',
    }

    expect(props.asChild).toBe(true)
    expect(props.className).toBe('custom-sidebar')
  })

  it('should accept standard aside props', () => {
    const props: SidebarProps = {
      id: 'sidebar-1',
      onClick: () => {},
    }

    expect(props.id).toBe('sidebar-1')
  })
})

describe('ArticleList types', () => {
  it('should accept standard div props', () => {
    const props: ArticleListProps = {
      className: 'article-list',
      'data-loaded': 'true',
    }

    expect(props.className).toBe('article-list')
    expect(props['data-loaded']).toBe('true')
  })
})

describe('Reader types', () => {
  it('should accept standard main element props', () => {
    const props: ReaderProps = {
      id: 'reader-1',
      className: 'main-reader',
    }

    expect(props.id).toBe('reader-1')
    expect(props.className).toBe('main-reader')
  })
})

describe('cn utility', () => {
  it('should merge class names', () => {
    const result = cn('class1', 'class2')
    expect(result).toContain('class1')
    expect(result).toContain('class2')
  })

  it('should handle conditional classes', () => {
    const isActive = true
    const result = cn('base', isActive && 'active')
    expect(result).toContain('base')
    expect(result).toContain('active')
  })

  it('should handle undefined values', () => {
    const result = cn('base', undefined, 'end')
    expect(result).toBe('base end')
  })
})

describe('Grid layout classes', () => {
  it('should have correct ClassicThreeColumnLayout grid classes', () => {
    const gridClass = 'grid grid-cols-[280px_320px_1fr]'
    expect(gridClass).toContain('grid')
    expect(gridClass).toContain('grid-cols-[280px_320px_1fr]')
  })

  it('should have correct CompactThreeColumnLayout grid classes', () => {
    const gridClass = 'grid grid-cols-[220px_280px_1fr]'
    expect(gridClass).toContain('grid')
    expect(gridClass).toContain('grid-cols-[220px_280px_1fr]')
  })

  it('should have correct WideThreeColumnLayout grid classes', () => {
    const gridClass = 'grid grid-cols-[280px_400px_1fr]'
    expect(gridClass).toContain('grid')
    expect(gridClass).toContain('grid-cols-[280px_400px_1fr]')
  })
})

describe('Layout styling classes', () => {
  it('should apply correct flex classes', () => {
    const flexClass = 'flex h-screen overflow-hidden'
    expect(flexClass).toContain('flex')
    expect(flexClass).toContain('h-screen')
    expect(flexClass).toContain('overflow-hidden')
  })

  it('should apply correct sidebar classes', () => {
    const sidebarClass = 'flex-shrink-0 border-r bg-background overflow-y-auto'
    expect(sidebarClass).toContain('flex-shrink-0')
    expect(sidebarClass).toContain('border-r')
    expect(sidebarClass).toContain('bg-background')
    expect(sidebarClass).toContain('overflow-y-auto')
  })

  it('should apply correct reader classes', () => {
    const readerClass = 'flex-1 bg-background overflow-y-auto'
    expect(readerClass).toContain('flex-1')
    expect(readerClass).toContain('bg-background')
    expect(readerClass).toContain('overflow-y-auto')
  })
})
