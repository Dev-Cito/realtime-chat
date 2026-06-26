'use client';
import { useEffect, useRef } from 'react';
import { Message, TypingUser } from '@/types';
import { useAuthStore } from '@/store/auth.store';

interface MessageListProps {
  messages: Message[];
  typingUsers: TypingUser[];
}

export default function MessageList({ messages, typingUsers }: MessageListProps) {
  const { user } = useAuthStore();
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, typingUsers]);

  const formatTime = (date: string) => {
    return new Date(date).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-4">
      {messages.length === 0 ? (
        <div className="flex items-center justify-center h-full">
          <p className="text-[#4ade80] text-sm">No messages yet — say hello! 👋</p>
        </div>
      ) : (
        messages.map((message) => {
          const isOwn = message.sender?.id === user?.id;
          return (
            <div key={message.id} className={`flex gap-3 ${isOwn ? 'flex-row-reverse' : ''}`}>
              <div className="w-8 h-8 rounded-full bg-[#16a34a] flex items-center justify-center text-[#f0fdf4] text-xs font-medium flex-shrink-0">
                {message.sender?.username?.[0]?.toUpperCase() ?? '?'}
              </div>
              <div className={`max-w-xs lg:max-w-md ${isOwn ? 'items-end' : 'items-start'} flex flex-col`}>
                <div className="flex items-baseline gap-2 mb-1">
                  {!isOwn && (
                    <span className="text-xs font-medium text-green-400">
                      {message.sender?.username}
                    </span>
                  )}
                  <span className="text-xs text-[#4ade80]">{formatTime(message.createdAt)}</span>
                </div>
                <div className={`px-4 py-2 rounded-2xl text-sm ${
                  isOwn
                    ? 'bg-[#16a34a] text-[#f0fdf4] rounded-tr-sm'
                    : 'bg-[#162019] text-gray-100 rounded-tl-sm'
                }`}>
                  {message.content}
                </div>
              </div>
            </div>
          );
        })
      )}

      {typingUsers.length > 0 && (
        <div className="flex gap-3">
          <div className="w-8 h-8 rounded-full bg-[#1c2b20] flex items-center justify-center text-xs">
            💬
          </div>
          <div className="bg-[#162019] px-4 py-2 rounded-2xl rounded-tl-sm">
            <div className="flex gap-1 items-center">
              <span className="text-xs text-[#86efac]">
                {typingUsers.map((t) => t.username).join(', ')} is typing
              </span>
              <span className="flex gap-0.5">
                {[0, 1, 2].map((i) => (
                  <span
                    key={i}
                    className="w-1 h-1 bg-gray-400 rounded-full animate-bounce"
                    style={{ animationDelay: `${i * 0.15}s` }}
                  />
                ))}
              </span>
            </div>
          </div>
        </div>
      )}

      <div ref={bottomRef} />
    </div>
  );
}