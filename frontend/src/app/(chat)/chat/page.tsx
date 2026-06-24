'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { useAuthStore } from '@/store/auth.store';
import { useChatStore } from '@/store/chat.store';
import { useSocket } from '@/hooks/useSocket';
import { useChat } from '@/hooks/useChat';
import { Room, ApiResponse } from '@/types';
import Navbar from '@/components/ui/Navbar';
import RoomList from '@/components/chat/RoomList';
import MessageList from '@/components/chat/MessageList';
import MessageInput from '@/components/chat/MessageInput';
import UserList from '@/components/chat/UserList';

export default function ChatPage() {
  const router = useRouter();
  const { user, token, isAuthenticated, setAuth, clearAuth } = useAuthStore();
  const { activeRoom, messages, typingUsers, setRooms, rooms } = useChatStore();
  const [loading, setLoading] = useState(true);
  const [showCreateRoom, setShowCreateRoom] = useState(false);
  const [newRoomName, setNewRoomName] = useState('');
  const [newRoomDesc, setNewRoomDesc] = useState('');

  const socket = useSocket(token);
  const { joinRoom, sendMessage, sendTyping, createRoom, loadRooms } = useChat();

  useEffect(() => {
    const init = async () => {
      try {
        const meRes = await api.get('/auth/me');
        const currentToken = useAuthStore.getState().token;
        setAuth(meRes.data.data, currentToken ?? '');
        const roomsList = await loadRooms();
        setRooms(roomsList);
      } catch {
        clearAuth();
        router.push('/login');
      } finally {
        setLoading(false);
      }
    };
    init();
  }, []);

  const handleJoinRoom = (room: Room) => {
    if (!token) return;
    joinRoom(room, token);
  };

  const handleSendMessage = (content: string) => {
    if (!activeRoom || !token) return;
    sendMessage(activeRoom.id, content, token);
  };

  const handleTyping = (isTyping: boolean) => {
    if (!activeRoom || !token) return;
    sendTyping(activeRoom.id, isTyping, token);
  };

  const handleCreateRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRoomName.trim()) return;
    try {
      const room = await createRoom(newRoomName, newRoomDesc);
      setShowCreateRoom(false);
      setNewRoomName('');
      setNewRoomDesc('');
      handleJoinRoom(room);
    } catch (err) {
      console.error('Failed to create room:', err);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const activeMessages = activeRoom ? (messages[activeRoom.id] ?? []) : [];
  const activeTyping = activeRoom ? (typingUsers[activeRoom.id] ?? []) : [];

  return (
    <div className="min-h-screen bg-gray-950 flex flex-col">
      <Navbar />

      <div className="flex flex-1 overflow-hidden" style={{ height: 'calc(100vh - 65px)' }}>
        <RoomList
          rooms={rooms}
          onJoinRoom={handleJoinRoom}
          onCreateRoom={() => setShowCreateRoom(true)}
        />

        <div className="flex-1 flex flex-col bg-gray-950">
          {activeRoom ? (
            <>
              <div className="px-6 py-4 border-b border-gray-800 bg-gray-900">
                <h2 className="text-white font-semibold"># {activeRoom.name}</h2>
                {activeRoom.description && (
                  <p className="text-gray-400 text-xs mt-0.5">{activeRoom.description}</p>
                )}
              </div>
              <MessageList messages={activeMessages} typingUsers={activeTyping} />
              <MessageInput onSend={handleSendMessage} onTyping={handleTyping} />
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <p className="text-4xl mb-4">💬</p>
                <h2 className="text-white font-semibold text-lg mb-2">Welcome to ChatApp</h2>
                <p className="text-gray-500 text-sm">Select a room to start chatting</p>
              </div>
            </div>
          )}
        </div>

        {activeRoom && (
          <UserList members={activeRoom.members ?? []} />
        )}
      </div>

      {showCreateRoom && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-gray-900 rounded-2xl border border-gray-800 p-6 w-full max-w-md">
            <h2 className="text-white font-semibold mb-4">Create a new room</h2>
            <form onSubmit={handleCreateRoom} className="space-y-4">
              <div>
                <label className="block text-sm text-gray-400 mb-1">Room name</label>
                <input
                  type="text"
                  value={newRoomName}
                  onChange={(e) => setNewRoomName(e.target.value)}
                  placeholder="e.g. general"
                  className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Description (optional)</label>
                <input
                  type="text"
                  value={newRoomDesc}
                  onChange={(e) => setNewRoomDesc(e.target.value)}
                  placeholder="What's this room about?"
                  className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-blue-500"
                />
              </div>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowCreateRoom(false)}
                  className="flex-1 bg-gray-800 text-gray-300 rounded-lg py-2.5 text-sm hover:bg-gray-700 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-blue-600 text-white rounded-lg py-2.5 text-sm hover:bg-blue-700 transition"
                >
                  Create
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}