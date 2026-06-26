'use client';
import { User } from '@/types';
import { useChatStore } from '@/store/chat.store';

interface UserListProps {
  members: User[];
}

export default function UserList({ members }: UserListProps) {
  const { onlineUsers } = useChatStore();

  return (
    <div className="w-52 bg-[#111a15] border-l border-[#1e3327] flex flex-col h-full">
      <div className="p-4 border-b border-[#1e3327]">
        <h2 className="text-[#f0fdf4] font-semibold text-sm">Members ({members.length})</h2>
      </div>
      <div className="flex-1 overflow-y-auto py-2">
        {members.map((member) => {
          const isOnline = !!onlineUsers[member.id];
          return (
            <div key={member.id} className="flex items-center gap-3 px-4 py-2">
              <div className="relative">
                <div className="w-8 h-8 rounded-full bg-[#16a34a] flex items-center justify-center text-[#f0fdf4] text-xs font-medium">
                  {member.username[0].toUpperCase()}
                </div>
                <div className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-gray-900 ${
                  isOnline ? 'bg-green-400' : 'bg-gray-500'
                }`} />
              </div>
              <span className={`text-sm ${isOnline ? 'text-[#f0fdf4]' : 'text-[#4ade80]'}`}>
                {member.username}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}