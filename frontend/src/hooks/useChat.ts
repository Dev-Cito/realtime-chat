'use client';
import { useCallback, useRef } from 'react';
import { getSocket } from '@/lib/socket';
import { useChatStore } from '@/store/chat.store';
import { api } from '@/lib/api';
import { Room, Message, ApiResponse } from '@/types';

export const useChat = () => {
  const { setMessages, setActiveRoom, addRoom } = useChatStore();
  const typingTimeoutRef = useRef<NodeJS.Timeout>();

  const joinRoom = useCallback(async (room: Room, token: string) => {
    const socket = getSocket(token);
    setActiveRoom(room);

    socket.off('room:history');
    socket.on('room:history', (data: { roomId: string; messages: Message[] }) => {
      if (data.roomId === room.id) {
        setMessages(room.id, data.messages);
      }
    });

    socket.emit('room:join', { roomId: room.id }, (response: any) => {
      if (response?.success) {
        console.log('Joined room:', room.name);
      }
    });
  }, [setActiveRoom, setMessages]);

  const leaveRoom = useCallback((roomId: string, token: string) => {
    const socket = getSocket(token);
    socket.emit('room:leave', { roomId });
    setActiveRoom(null);
  }, [setActiveRoom]);

  const sendMessage = useCallback((roomId: string, content: string, token: string) => {
    const socket = getSocket(token);
    socket.emit('message:send', { roomId, content });
  }, []);

  const sendTyping = useCallback((roomId: string, isTyping: boolean, token: string) => {
    const socket = getSocket(token);

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    socket.emit('message:typing', { roomId, isTyping });

    if (isTyping) {
      typingTimeoutRef.current = setTimeout(() => {
        socket.emit('message:typing', { roomId, isTyping: false });
      }, 3000);
    }
  }, []);

  const createRoom = useCallback(async (name: string, description?: string) => {
    const res = await api.post<ApiResponse<Room>>('/rooms', {
      name,
      description,
      type: 'public',
    });
    const room = res.data.data;
    addRoom(room);
    return room;
  }, [addRoom]);

  const loadRooms = useCallback(async () => {
    const res = await api.get<ApiResponse<Room[]>>('/rooms');
    return res.data.data;
  }, []);

  return { joinRoom, leaveRoom, sendMessage, sendTyping, createRoom, loadRooms };
};