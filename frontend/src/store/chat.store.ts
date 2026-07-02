import { create } from 'zustand';
import { Room, Message, TypingUser } from '@/types';

interface ChatState {
  rooms: Room[];
  activeRoom: Room | null;
  messages: Record<string, Message[]>;
  typingUsers: Record<string, TypingUser[]>;
  onlineUsers: Record<string, string>;
  setRooms: (rooms: Room[]) => void;
  addRoom: (room: Room) => void;
  setActiveRoom: (room: Room | null) => void;
  setMessages: (roomId: string, messages: Message[]) => void;
  addMessage: (roomId: string, message: Message) => void;
  setTyping: (roomId: string, typingUser: TypingUser) => void;
  setOnlineUsers: (users: Record<string, string>) => void;
  setUserOnline: (userId: string, socketId: string) => void;
  setUserOffline: (userId: string) => void;
}

export const useChatStore = create<ChatState>((set) => ({
  rooms: [],
  activeRoom: null,
  messages: {},
  typingUsers: {},
  onlineUsers: {},

  setRooms: (rooms) => set({ rooms }),
  addRoom: (room) => set((s) => ({
    rooms: s.rooms.some((r) => r.id === room.id)
      ? s.rooms
      : [room, ...s.rooms],
  })),
  setActiveRoom: (room) => set({ activeRoom: room }),

  setMessages: (roomId, messages) =>
    set((s) => ({ messages: { ...s.messages, [roomId]: messages } })),

  addMessage: (roomId, message) =>
    set((s) => ({
      messages: {
        ...s.messages,
        [roomId]: [...(s.messages[roomId] ?? []), message],
      },
    })),

  setTyping: (roomId, typingUser) =>
    set((s) => {
      const current = s.typingUsers[roomId] ?? [];
      const filtered = current.filter((t) => t.userId !== typingUser.userId);
      return {
        typingUsers: {
          ...s.typingUsers,
          [roomId]: typingUser.isTyping ? [...filtered, typingUser] : filtered,
        },
      };
    }),

  setOnlineUsers: (users) => set({ onlineUsers: users }),

  setUserOnline: (userId, socketId) =>
    set((s) => ({ onlineUsers: { ...s.onlineUsers, [userId]: socketId } })),

  setUserOffline: (userId) =>
    set((s) => {
      const { [userId]: _, ...rest } = s.onlineUsers;
      return { onlineUsers: rest };
    }),
}));