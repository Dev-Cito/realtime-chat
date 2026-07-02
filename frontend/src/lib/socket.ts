import { io, Socket } from 'socket.io-client';

let socket: Socket | null = null;
let connectedToken: string | null = null;

export const getSocket = (token?: string): Socket => {
  if (!socket) {
    socket = io(process.env.NEXT_PUBLIC_WS_URL ?? 'http://localhost:3004', {
      auth: { token },
      transports: ['websocket', 'polling'],
      autoConnect: false,
    });
  }
  return socket;
};

export const connectSocket = (token: string): Socket => {
  const s = getSocket(token);
  s.auth = { token };

  if (!token) {
    console.warn('[socket] connectSocket called with empty token — connection will likely be rejected');
  }

  if (s.connected && connectedToken !== token) {
    console.log('[socket] token changed, reconnecting');
    s.disconnect();
    s.connect();
  } else if (!s.connected) {
    console.log('[socket] connecting, token length:', token?.length ?? 0);
    s.connect();
  }

  connectedToken = token;
  return s;
};

export const disconnectSocket = (): void => {
  if (socket?.connected) {
    socket.disconnect();
    socket = null;
    connectedToken = null;
  }
};