'use client';
import { useState, useRef } from 'react';
import dynamic from 'next/dynamic';

const EmojiPicker = dynamic(() => import('emoji-picker-react'), { ssr: false });

interface MessageInputProps {
  onSend: (content: string) => void;
  onTyping: (isTyping: boolean) => void;
  disabled?: boolean;
}

export default function MessageInput({ onSend, onTyping, disabled }: MessageInputProps) {
  const [content, setContent] = useState('');
  const [showEmojis, setShowEmojis] = useState(false);
  const isTypingRef = useRef(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setContent(e.target.value);
    if (!isTypingRef.current) {
      isTypingRef.current = true;
      onTyping(true);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim() || disabled) return;
    onSend(content.trim());
    setContent('');
    isTypingRef.current = false;
    onTyping(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      handleSubmit(e as any);
    }
  };

  const handleEmojiClick = (emojiData: any) => {
    setContent((prev) => prev + emojiData.emoji);
    setShowEmojis(false);
  };

  return (
    <div className="relative">
      {showEmojis && (
        <div className="absolute bottom-16 left-4 z-50">
          <EmojiPicker
            onEmojiClick={handleEmojiClick}
            theme={'dark' as any}
            height={350}
            width={300}
          />
        </div>
      )}

      <form onSubmit={handleSubmit} className="p-4 border-t border-gray-800">
        <div className="flex gap-3 items-center">
          <button
            type="button"
            onClick={() => setShowEmojis((v) => !v)}
            disabled={disabled}
            className="text-gray-400 hover:text-white transition text-xl disabled:opacity-50"
          >
            😊
          </button>

          <input
            type="text"
            value={content}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            disabled={disabled}
            placeholder={disabled ? 'Select a room to chat...' : 'Type a message...'}
            className="flex-1 bg-gray-800 text-white placeholder-gray-500 px-4 py-3 rounded-xl border border-gray-700 focus:outline-none focus:border-blue-500 transition disabled:opacity-50"
          />

          <button
            type="submit"
            disabled={!content.trim() || disabled}
            className="bg-blue-600 text-white px-5 py-3 rounded-xl hover:bg-blue-700 transition disabled:opacity-40 disabled:cursor-not-allowed font-medium"
          >
            Send
          </button>
        </div>
      </form>
    </div>
  );
}