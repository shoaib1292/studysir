'use client'

import { useCallback, useEffect, useState } from 'react'
import { GraduationCap } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { api } from '@/lib/api'
import type { FeedItem } from '@/lib/types'
import { useAppStore } from '@/store/useAppStore'
import { PostTuitionDialog } from '../dialogs/PostTuitionDialog'
import { TuitionCard } from '../cards/TuitionCard'
import { CardSkeleton } from '../shared/bits'
import { EmptyState } from '../shared/EmptyState'

export function TuitionView() {
  const me = useAppStore((s) => s.me)!
  const nonce = useAppStore((s) => s.nonce)

  const [items, setItems] = useState<FeedItem[] | null>(null)
  const [postOpen, setPostOpen] = useState(false)

  const load = useCallback(async () => {
    try {
      const d = await api.getFeed('tuition')
      setItems(d.items)
    } catch {
      setItems([])
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load, nonce])

  const tuitions = (items ?? []).filter((i) => i.kind === 'tuition')
  const openRequests = tuitions.filter((i) => i.kind === 'tuition' && i.tuition.status === 'OPEN')
  const myPosts = tuitions.filter((i) => i.kind === 'tuition' && i.tuition.authorId === me.id)

  return (
    <div className="mx-auto w-full max-w-3xl space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-xl font-bold">Tution Requests</h1>
        {me.role !== 'TEACHER' ? (
          <Button onClick={() => setPostOpen(true)}>
            <GraduationCap className="size-4" />
            Post Tution
          </Button>
        ) : null}
      </div>

      <Tabs defaultValue="open" className="gap-4">
        <TabsList className="grid w-full grid-cols-2 sm:w-fit">
          <TabsTrigger value="open">Open Requests</TabsTrigger>
          <TabsTrigger value="mine">My Posts</TabsTrigger>
        </TabsList>

        <TabsContent value="open" className="space-y-4">
          {items === null ? (
            <>
              <CardSkeleton />
              <CardSkeleton />
            </>
          ) : openRequests.length === 0 ? (
            <EmptyState
              icon={GraduationCap}
              title="No open requests right now"
              hint={
                me.role === 'TEACHER'
                  ? 'When students or parents post new tuition, they will appear here.'
                  : 'Post your tuition need and teachers will approach you.'
              }
              action={
                me.role !== 'TEACHER' ? (
                  <Button size="sm" onClick={() => setPostOpen(true)}>
                    Post Tution
                  </Button>
                ) : undefined
              }
            />
          ) : (
            openRequests.map((i) =>
              i.kind === 'tuition' ? <TuitionCard key={i.tuition.id} tuition={i.tuition} onChanged={load} /> : null
            )
          )}
        </TabsContent>

        <TabsContent value="mine" className="space-y-4">
          {items === null ? (
            <CardSkeleton />
          ) : myPosts.length === 0 ? (
            <EmptyState
              icon={GraduationCap}
              title="You haven’t posted any tuition yet"
              hint="Your posts and the teachers who contacted you will show up here."
              action={
                me.role !== 'TEACHER' ? (
                  <Button size="sm" onClick={() => setPostOpen(true)}>
                    Post Tution
                  </Button>
                ) : undefined
              }
            />
          ) : (
            myPosts.map((i) =>
              i.kind === 'tuition' ? (
                <TuitionCard key={i.tuition.id} tuition={i.tuition} onChanged={load} showOwnerActions />
              ) : null
            )
          )}
        </TabsContent>
      </Tabs>

      <PostTuitionDialog open={postOpen} onOpenChange={setPostOpen} onPosted={load} />
    </div>
  )
}
