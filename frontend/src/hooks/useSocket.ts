'use client';
import { useEffect, useRef } from 'react';
import { Socket } from 'socket.io-client';
import { connectSocket, disconnectSocket } from '@/lib/socket';
import { useChatStore } from '@/store/chat.store';
import { Message, Room, TypingUser } from '@/types';

export const useSocket = (token: string | null) => {
  const socketRef = useRef<Socket | null>(null);
  const { addMessage, addRoom, setTyping, setUserOnline, setUserOffline, setOnlineUsers } = useChatStore();

  useEffect(() => {
    if (!token) return;

    const socket = connectSocket(token);
    socketRef.current = socket;

    socket.on('connect', () => {
      console.log('Socket connected:', socket.id);
      socket.emit('users:online');
    });

    socket.on('disconnect', () => {
      console.log('Socket disconnected');
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
      socket.off('message:new');
      socket.off('message:typing');
      socket.off('user:online');
      socket.off('user:offline');
      socket.off('users:online');
      socket.off('room:new');
    };
  }, [token]);

  return socketRef.current;
};