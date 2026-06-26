'use client';
import { SidebarProvider } from '@/components/blocks/sidebar';
import { ChatTemplate } from '@/components/blocks/chat-template';

export default function ChatPage() {
  return (
    <SidebarProvider>
      <ChatTemplate />
    </SidebarProvider>
  );
}
