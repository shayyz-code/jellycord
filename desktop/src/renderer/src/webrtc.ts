import { io, Socket } from 'socket.io-client'

let socket: Socket
let pc: RTCPeerConnection
let localStream: MediaStream

const rtcConfig: RTCConfiguration = {
  iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
}

export async function getMedia(): Promise<void> {
  localStream = await navigator.mediaDevices.getUserMedia({
    video: true,
    audio: true
  })

  const localVideo = document.getElementById('local') as HTMLVideoElement
  localVideo.srcObject = localStream
}

export function createPeerConnection(room: string): void {
  pc = new RTCPeerConnection(rtcConfig)

  // Send ICE candidates to signaling server
  pc.onicecandidate = (event) => {
    if (event.candidate) {
      socket.emit('signal', {
        room,
        type: 'ice-candidate',
        candidate: event.candidate
      })
    }
  }

  // Receive remote video/audio
  pc.ontrack = (event) => {
    const remoteVideo = document.getElementById('remote') as HTMLVideoElement
    remoteVideo.srcObject = event.streams[0]
  }

  // Add local tracks BEFORE creating offer/answer
  localStream.getTracks().forEach((track) => pc.addTrack(track, localStream))
}

export function connectSocket(): void {
  socket = io('http://localhost:3000')
  console.log('Connected to signaling server')

  socket.on('signal', async (data) => {
    switch (data.type) {
      case 'user-joined':
        createPeerConnection(data.room)
        await createOffer(data.room)
        break

      case 'offer':
        createPeerConnection(data.room)
        await receiveOffer(data.sdp, data.room)
        break

      case 'answer':
        await pc.setRemoteDescription(data.sdp)
        break

      case 'ice-candidate':
        await pc.addIceCandidate(data.candidate)
        break
    }
  })
}

export async function createOffer(room: string): Promise<void> {
  const offer = await pc.createOffer()
  await pc.setLocalDescription(offer)

  socket.emit('signal', {
    room,
    type: 'offer',
    sdp: offer
  })
}

export async function receiveOffer(offer: RTCSessionDescriptionInit, room: string): Promise<void> {
  await pc.setRemoteDescription(offer)

  const answer = await pc.createAnswer()
  await pc.setLocalDescription(answer)

  socket.emit('signal', {
    room,
    type: 'answer',
    sdp: answer
  })
}

export const handleJoin = async (room: string): Promise<void> => {
  await getMedia()
  connectSocket()

  socket.emit('join-room', { room })
}
