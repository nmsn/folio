import React, { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@folio/ui'
import { Button } from '@folio/ui'
import { Input } from '@folio/ui'
import { Label } from '@folio/ui'

type AddFeedDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (input: { url: string; name?: string }) => Promise<void>
  submitting?: boolean
  error?: string | null
}

export function AddFeedDialog({
  open,
  onOpenChange,
  onSubmit,
  submitting,
  error,
}: AddFeedDialogProps) {
  const [url, setUrl] = useState('')
  const [name, setName] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const trimmedUrl = url.trim()
    if (!trimmedUrl) return
    await onSubmit({
      url: trimmedUrl,
      name: name.trim() || undefined,
    })
    setUrl('')
    setName('')
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>添加订阅源</DialogTitle>
            <DialogDescription>输入 RSS / Atom 地址，可选填写名称。</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="feed-url">Feed URL</Label>
              <Input
                id="feed-url"
                type="url"
                required
                placeholder="https://example.com/feed.xml"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                autoFocus
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="feed-name">名称（可选）</Label>
              <Input
                id="feed-name"
                placeholder="留空则使用源标题或域名"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            {error ? <p className="text-sm text-red-500">{error}</p> : null}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              取消
            </Button>
            <Button type="submit" disabled={submitting || !url.trim()}>
              {submitting ? '添加中…' : '添加'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
