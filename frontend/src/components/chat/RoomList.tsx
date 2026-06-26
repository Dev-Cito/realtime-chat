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
    <div className="w-64 bg-[#111a15] border-r border-[#1e3327] flex flex-col h-full">
      <div className="p-4 border-b border-[#1e3327] flex items-center justify-between">
        <h2 className="text-[#f0fdf4] font-semibold text-sm">Rooms</h2>
        <button
          onClick={onCreateRoom}
          className="text-xs bg-[#16a34a] text-[#f0fdf4] px-2 py-1 rounded hover:bg-[#14532d] transition"
        >
          + New
        </button>
      </div>
      <div className="flex-1 overflow-y-auto py-2">
        {rooms.length === 0 ? (
          <p className="text-[#4ade80] text-xs text-center py-4">No rooms yet</p>
        ) : (
          rooms.map((room) => (
            <button
              key={room.id}
              onClick={() => onJoinRoom(room)}
              className={`w-full text-left px-4 py-3 hover:bg-[#162019] transition ${
                activeRoom?.id === room.id ? 'bg-[#162019] border-l-2 border-green-500' : ''
              }`}
            >
              <div className="flex items-center gap-2">
                <span className="text-[#86efac] text-sm">#</span>
                <span className="text-sm text-[#f0fdf4] truncate">{room.name}</span>
              </div>
              {room.description && (
                <p className="text-xs text-[#4ade80] truncate mt-0.5 ml-4">
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