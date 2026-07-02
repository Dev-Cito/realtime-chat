'use client';
import { useCallback, useRef } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { getSocket, connectSocket } from '@/lib/socket';
import { useChatStore } from '@/store/chat.store';
import { api } from '@/lib/api';
import { Room, ApiResponse } from '@/types';

interface RoomJoinResponse { success: boolean; room?: Room; error?: string }
interface RoomCreateResponse { success: boolean; room: Room; error?: string }

export const useChat = () => {
  const { setActiveRoom } = useChatStore(
    useShallow((s) => ({ setActiveRoom: s.setActiveRoom }))
  );
  const typingTimeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);

  const joinRoom = useCallback((room: Room, token: string) => {
    const socket = connectSocket(token);
    setActiveRoom(room);

    const doJoin = () => {
      const timer = setTimeout(() => {
        console.warn('room:join timed out for room:', room.id);
      }, 10_000);

      socket.emit('room:join', { roomId: room.id }, (response: RoomJoinResponse) => {
        clearTimeout(timer);
        if (response?.success) {
          console.log('Joined room:', room.name ?? room.id);
        } else {
          console.warn('room:join failed:', response?.error);
        }
      });
    };

    if (socket.connected) {
      doJoin();
    } else {
      const connectTimer = setTimeout(() => {
        socket.off('connect', doJoin);
        console.warn('Socket connect timed out before room join');
      }, 10_000);
      socket.once('connect', () => { clearTimeout(connectTimer); doJoin(); });
    }
  }, [setActiveRoom]);

  const leaveRoom = useCallback((roomId: string, token: string) => {
    const socket = getSocket(token);
    socket.emit('room:leave', { roomId });
    setActiveRoom(null);
  }, [setActiveRoom]);

  const sendMessage = useCallback((roomId: string, content: string, token: string) => {
    const socket = connectSocket(token);

    if (!socket.connected) {
      const timer = setTimeout(() => {
        socket.off('connect', send);
        console.warn('sendMessage: socket did not connect in time, message dropped');
      }, 10_000);
      const send = () => { clearTimeout(timer); socket.emit('message:send', { roomId, content }); };
      socket.once('connect', send);
      return;
    }

    socket.emit('message:send', { roomId, content });
  }, []);

  const sendTyping = useCallback((roomId: string, isTyping: boolean, token: string) => {
    const socket = getSocket(token);
    if (!socket.connected) return;

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

  const createRoom = useCallback((name: string, description?: string): Promise<Room> => {
    const socketPromise = new Promise<Room>((resolve, reject) => {
      const socket = getSocket();
      if (!socket.connected) {
        reject(new Error('Socket not connected'));
        return;
      }
      socket.emit('room:create', { name, description }, (response: RoomCreateResponse) => {
        if (response?.success) resolve(response.room);
        else reject(new Error(response?.error ?? 'Failed to create room'));
      });
    });
    const timeout = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('Room creation timed out')), 10_000),
    );
    return Promise.race([socketPromise, timeout]);
  }, []);

  // Uses /rooms/my to return ALL rooms the user belongs to (public + direct)
  const loadRooms = useCallback(async () => {
    const res = await api.get<ApiResponse<Room[]>>('/rooms/my');
    return res.data.data;
  }, []);

  // Returns all public rooms (for discovery — user may or may not be a member)
  const loadPublicRooms = useCallback(async () => {
    const res = await api.get<ApiResponse<Room[]>>('/rooms');
    return res.data.data;
  }, []);

  const createDirectRoom = useCallback(async (targetUserId: string): Promise<Room> => {
    const res = await api.post<ApiResponse<Room>>('/rooms/direct', { targetUserId });
    return res.data.data;
  }, []);

  return { joinRoom, leaveRoom, sendMessage, sendTyping, createRoom, loadRooms, loadPublicRooms, createDirectRoom };
};
