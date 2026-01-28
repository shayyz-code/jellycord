import express from 'express'
import http from 'http'
import { Server, Socket } from 'socket.io'

const app = express()
const server = http.createServer(app)

const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
})

const PORT = 3000

// roomName -> socketIds[]
const rooms = new Map<string, string[]>()

io.on('connection', (socket: Socket) => {
  console.log('Connected:', socket.id)

  socket.on('join-room', ({ room }: { room: string }) => {
    const peers = rooms.get(room) ?? []

    if (peers.length >= 2) {
      socket.emit('room-full')
      return
    }

    peers.push(socket.id)
    rooms.set(room, peers)
    socket.join(room)

    console.log(`Room ${room}:`, peers)

    // Tell joining peer about room state
    socket.emit('room-joined', {
      room,
      peers,
      shouldCreateOffer: peers.length === 2
    })

    // Notify existing peer
    socket.to(room).emit('peer-joined', {
      peerId: socket.id
    })
  })

  socket.on(
    'signal',
    (data: {
      room: string
      target: string
      type: 'offer' | 'answer' | 'ice-candidate'
      sdp?: RTCSessionDescriptionInit
      candidate?: RTCIceCandidateInit
    }) => {
      io.to(data.target).emit('signal', {
        from: socket.id,
        type: data.type,
        sdp: data.sdp,
        candidate: data.candidate
      })
    }
  )

  socket.on('disconnect', () => {
    console.log('Disconnected:', socket.id)

    for (const [room, peers] of rooms.entries()) {
      const updated = peers.filter((id) => id !== socket.id)

      if (updated.length === 0) {
        rooms.delete(room)
      } else {
        rooms.set(room, updated)
        socket.to(room).emit('peer-left', {
          peerId: socket.id
        })
      }
    }
  })
})

server.listen(PORT, () => {
  console.log(`Signaling server running at http://localhost:${PORT}`)
})
