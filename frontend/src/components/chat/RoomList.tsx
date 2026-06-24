'use client';
import { Room } from '@/types';
import { useChatStore } from '@/store/chat.store';

interface RoomListProps {
  rooms: Room[];
  onJoinRoom: (room: Room) => void;
  onCreateRoom: () => void;
}

export default function RoomList({ rooms, onJoinRoom, onCreateRoom }: RoomListProps) {
  const { activeRoom } = useChatStore();

  return (
    <div className="w-64 bg-gray-900 border-r border-gray-800 flex flex-col h-full">
      <div className="p-4 border-b border-gray-800 flex items-center justify-between">
        <h2 className="text-white font-semibold text-sm">Rooms</h2>
        <button
          onClick={onCreateRoom}
          className="text-xs bg-blue-600 text-white px-2 py-1 rounded hover:bg-blue-700 transition"
        >
          + New
        </button>
      </div>
      <div className="flex-1 overflow-y-auto py-2">
        {rooms.length === 0 ? (
          <p className="text-gray-500 text-xs text-center py-4">No rooms yet</p>
        ) : (
          rooms.map((room) => (
            <button
              key={room.id}
              onClick={() => onJoinRoom(room)}
              className={`w-full text-left px-4 py-3 hover:bg-gray-800 transition ${
                activeRoom?.id === room.id ? 'bg-gray-800 border-l-2 border-blue-500' : ''
              }`}
            >
              <div className="flex items-center gap-2">
                <span className="text-gray-400 text-sm">#</span>
                <span className="text-sm text-gray-300 truncate">{room.name}</span>
              </div>
              {room.description && (
                <p className="text-xs text-gray-500 truncate mt-0.5 ml-4">
                  {room.description}
                </p>
              )}
            </button>
          ))
        )}
      </div>
    </div>
  );
}