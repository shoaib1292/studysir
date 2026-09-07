/**
 * StudySir realtime service
 * - :3003 socket.io endpoint (proxied by Caddy via /?XTransformPort=3003, path '/')
 * - :3013 internal REST bridge for the Next.js API to push events (localhost only)
 *
 * Client → server:
 *   hello            { userId, name }
 *   typing           { toUserId, connectionId, isTyping }
 *
 * Server → client:
 *   presence:snapshot { online: string[] }
 *   presence:update   { userId, online }
 *   typing            { connectionId, userId, isTyping }
 *
 * REST bridge (POST :3013/emit, body { event, payload, userIds: string[] }):
 *   chat:message   { connectionId, message }
 *   chat:updated   { connectionId }
 *   chat:read      { connectionId, readerId }
 *   notif:new      { unread }
 *   wallet:changed { coins, money }
 */
import { createServer } from 'http'
import { Server } from 'socket.io'

const PORT = 3003
const BRIDGE_PORT = 3013

const httpServer = createServer()
const io = new Server(httpServer, {
  // DO NOT change the path, it is used by Caddy to forward the request to the correct port
  path: '/',
  cors: { origin: '*', methods: ['GET', 'POST'] },
  pingTimeout: 60000,
  pingInterval: 25000,
})

/** userId -> set of connected socket ids */
const presence = new Map<string, Set<string>>()

function onlineIds(): string[] {
  return [...presence.keys()]
}

io.on('connection', (socket) => {
  let userId: string | null = null

  socket.on('hello', (data: { userId?: string; name?: string }) => {
    const id = typeof data?.userId === 'string' ? data.userId : null
    if (!id) return
    userId = id
    socket.data.userId = id
    socket.data.name = typeof data?.name === 'string' ? data.name : ''
    void socket.join(`user:${id}`)

    let sockets = presence.get(id)
    const first = !sockets || sockets.size === 0
    if (!sockets) {
      sockets = new Set()
      presence.set(id, sockets)
    }
    sockets.add(socket.id)

    socket.emit('presence:snapshot', { online: onlineIds() })
    if (first) io.emit('presence:update', { userId: id, online: true })
  })

  socket.on('typing', (data: { toUserId?: string; connectionId?: string; isTyping?: boolean }) => {
    if (!userId || !data?.toUserId || !data?.connectionId) return
    io.to(`user:${data.toUserId}`).emit('typing', {
      connectionId: data.connectionId,
      userId,
      name: socket.data.name ?? '',
      isTyping: Boolean(data.isTyping),
    })
  })

  socket.on('disconnect', () => {
    if (!userId) return
    const sockets = presence.get(userId)
    if (!sockets) return
    sockets.delete(socket.id)
    if (sockets.size === 0) {
      presence.delete(userId)
      io.emit('presence:update', { userId, online: false })
    }
  })

  socket.on('error', (err) => console.error(`socket error (${socket.id}):`, err))
})

// ---- internal REST bridge for the Next.js API ----
type EmitBody = { event?: string; payload?: unknown; userIds?: string[] }

createServer(async (req, res) => {
  if (req.method === 'GET' && req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify({ ok: true, online: onlineIds() }))
    return
  }
  if (req.method === 'POST' && req.url === '/emit') {
    let body = ''
    for await (const chunk of req) body += chunk
    try {
      const { event, payload, userIds } = JSON.parse(body || '{}') as EmitBody
      if (!event || !Array.isArray(userIds)) {
        res.writeHead(400, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify({ error: 'event and userIds are required' }))
        return
      }
      for (const uid of userIds) {
        if (typeof uid === 'string' && uid) io.to(`user:${uid}`).emit(event, payload)
      }
      res.writeHead(200, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify({ ok: true, delivered: userIds.length }))
    } catch {
      res.writeHead(400, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify({ error: 'invalid json' }))
    }
    return
  }
  res.writeHead(404, { 'Content-Type': 'application/json' })
  res.end(JSON.stringify({ error: 'not found' }))
}).listen(BRIDGE_PORT, '127.0.0.1', () => {
  console.log(`[realtime] internal emit bridge on 127.0.0.1:${BRIDGE_PORT}`)
})

httpServer.listen(PORT, () => {
  console.log(`[realtime] socket.io server on :${PORT}`)
})

process.on('SIGTERM', () => {
  httpServer.close(() => process.exit(0))
})
process.on('SIGINT', () => {
  httpServer.close(() => process.exit(0))
})
