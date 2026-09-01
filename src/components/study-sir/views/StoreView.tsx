'use client'

import { useCallback, useEffect, useState } from 'react'
import { ShoppingBag } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { api } from '@/lib/api'
import type { GoodDTO } from '@/lib/types'
import { useAppStore } from '@/store/useAppStore'
import { PostGoodDialog } from '../dialogs/PostGoodDialog'
import { GoodCard } from '../cards/GoodCard'
import { CardSkeleton } from '../shared/bits'
import { EmptyState } from '../shared/EmptyState'

export function StoreView() {
  const me = useAppStore((s) => s.me)!
  const nonce = useAppStore((s) => s.nonce)

  const [goods, setGoods] = useState<GoodDTO[] | null>(null)
  const [postOpen, setPostOpen] = useState(false)

  const load = useCallback(async () => {
    try {
      const d = await api.getFeed('good')
      setGoods(d.items.filter((i) => i.kind === 'good').map((i) => (i.kind === 'good' ? i.good : null)).filter(Boolean) as GoodDTO[])
    } catch {
      setGoods([])
    }
  }, [])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load()
  }, [load, nonce])

  const isTeacher = me.role === 'TEACHER'

  return (
    <div className="mx-auto w-full max-w-6xl space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-xl font-bold">Digital Store</h1>
        {isTeacher ? (
          <Button onClick={() => setPostOpen(true)}>
            <ShoppingBag className="size-4" />
            Sell an Item
          </Button>
        ) : null}
      </div>

      {goods === null ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          <CardSkeleton />
          <CardSkeleton />
          <CardSkeleton />
        </div>
      ) : goods.length === 0 ? (
        <EmptyState
          icon={ShoppingBag}
          title="The store is empty"
          hint="Teachers can sell notes, e-books and study material bought with the money wallet."
          action={
            isTeacher ? (
              <Button size="sm" onClick={() => setPostOpen(true)}>
                Sell an Item
              </Button>
            ) : undefined
          }
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {goods.map((good) => (
            <GoodCard key={good.id} good={good} onChanged={load} />
          ))}
        </div>
      )}

      <PostGoodDialog open={postOpen} onOpenChange={setPostOpen} onPosted={load} />
    </div>
  )
}
