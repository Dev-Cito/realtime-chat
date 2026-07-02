'use client';
import { useEffect, useRef } from 'react';
import { Socket } from 'socket.io-client';
import { useShallow } from 'zustand/react/shallow';
import { connectSocket } from '@/lib/socket';
import { useChatStore } from '@/store/chat.store';
import { Message, Room, TypingUser } from '@/types';

export const useSocket = (token: string | null) => {
  const socketRef = useRef<Socket | null>(null);
  const {
    addMessage, addRoom, setMessages,
    setTyping, setUserOnline, setUserOffline, setOnlineUsers,
  } = useChatStore(
    useShallow((s) => ({
      addMessage: s.addMessage,
      addRoom: s.addRoom,
      setMessages: s.setMessages,
      setTyping: s.setTyping,
      setUserOnline: s.setUserOnline,
      setUserOffline: s.setUserOffline,
      setOnlineUsers: s.setOnlineUsers,
    }))
  );

  useEffect(() => {
    if (!token) return;

    const socket = connectSocket(token);
    socketRef.current = socket;

    socket.on('connect', () => {
      console.log('Socket connected:', socket.id);
      socket.emit('users:online');
    });

    socket.on('connect_error', (err) => {
      console.error('Socket connect error:', err.message);
    });

    socket.on('disconnect', (reason) => {
      console.log('Socket disconnected:', reason);
    });

    // room:history lives here (not inside joinRoom) to avoid duplicate listeners
    socket.on('room:history', (data: { roomId: string; messages: Message[] }) => {
      setMessages(data.roomId, data.messages);
    });

    socket.on('message:new', (message: Message) => {
      addMessage(message.roomId, message);
    });

    socket.on('message:typing', (data: TypingUser) => {
      setTyping(data.roomId, data);
    });

    socket.on('user:online', (data: { userId: string; socketId?: string }) => {
      setUserOnline(data.userId, data.socketId ?? '');
    });

    socket.on('user:offline', (data: { userId: string }) => {
      setUserOffline(data.userId);
    });

    socket.on('users:online', (users: Record<string, string>) => {
      setOnlineUsers(users);
    });

    socket.on('room:new', (room: Room) => {
      addRoom(room);
    });

    return () => {
      socket.off('connect');
      socket.off('connect_error');
      socket.off('disconnect');
      socket.off('room:history');
      socket.off('message:new');
      socket.off('message:typing');
      socket.off('user:online');
      socket.off('user:offline');
      socket.off('users:online');
      socket.off('room:new');
    };
  }, [token, addMessage, addRoom, setMessages, setTyping, setUserOnline, setUserOffline, setOnlineUsers]);

  return socketRef.current;
};
