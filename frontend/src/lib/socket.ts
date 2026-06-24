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
  if (s.connected && connectedToken !== token) {
    s.disconnect();
    s.connect();
  } else if (!s.connected) {
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