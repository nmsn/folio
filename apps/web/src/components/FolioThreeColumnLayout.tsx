import * as React from 'react'

/** Folio three-column RSS reader shell. Always applies `.folio-app` grid class. */
export const FolioThreeColumnLayout = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, children, ...props }, ref) => {
  // Avoid cn()/tailwind-merge — it can strip the custom `.folio-app` class.
  const merged = ['folio-app', className].filter(Boolean).join(' ')
  return (
    <div ref={ref} className={merged} {...props}>
      {children}
    </div>
  )
})
FolioThreeColumnLayout.displayName = 'FolioThreeColumnLayout'
