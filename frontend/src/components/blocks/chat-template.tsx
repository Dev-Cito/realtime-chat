"use client"

import React, { useEffect, useRef, useState } from "react"
import {
  SidebarInset, Sidebar, SidebarContent, SidebarGroup,
  SidebarGroupContent, SidebarGroupLabel, SidebarMenu,
  SidebarMenuButton, SidebarMenuItem, SidebarFooter, useSidebar,
} from "@/components/blocks/sidebar"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { CardDescription, CardTitle } from "@/components/ui/card"
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@/components/ui/resizable"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Menu, MessageCircle, Phone, CircleFadingPlus, Settings, User2, ChevronUp, Search, Send, Smile, Video, SquarePen, Users } from "lucide-react"
import dynamic from "next/dynamic"
import { useShallow } from "zustand/react/shallow"
import { useAuthStore } from "@/store/auth.store"
import { useChatStore } from "@/store/chat.store"
import { useChat } from "@/hooks/useChat"
import { useSocket } from "@/hooks/useSocket"
import { Room } from "@/types"
import { api } from "@/lib/api"
import { disconnectSocket } from "@/lib/socket"
import { clearSessionCookie } from "@/lib/session"

const EmojiPicker = dynamic(() => import("emoji-picker-react"), { ssr: false })

const menuItems = [
  { title: "Messages", url: "#", icon: MessageCircle },
  { title: "Phone", url: "#", icon: Phone },
  { title: "Status", url: "#", icon: CircleFadingPlus },
]

export const ChatTemplate = () => {
  const { toggleSidebar } = useSidebar()
  const { user, token, isAuthenticated, setAuth, clearAuth } = useAuthStore(
    useShallow((s) => ({ user: s.user, token: s.token, isAuthenticated: s.isAuthenticated, setAuth: s.setAuth, clearAuth: s.clearAuth }))
  )
  const { rooms, activeRoom, messages, typingUsers, setRooms } = useChatStore(
    useShallow((s) => ({ rooms: s.rooms, activeRoom: s.activeRoom, messages: s.messages, typingUsers: s.typingUsers, setRooms: s.setRooms }))
  )
  const { joinRoom, sendMessage, sendTyping, createRoom, loadRooms } = useChat()
  const socket = useSocket(token)

  const bottomRef = useRef<HTMLDivElement>(null)

  const [loading, setLoading] = useState(true)
  const [content, setContent] = useState("")
  const [showEmojis, setShowEmojis] = useState(false)
  const [showCreateRoom, setShowCreateRoom] = useState(false)
  const [newRoomName, setNewRoomName] = useState("")

  useEffect(() => {
    const init = async () => {
      try {
        const meRes = await api.get('/auth/me')
        const currentToken = useAuthStore.getState().token
        setAuth(meRes.data.data, currentToken ?? '')
        const roomsList = await loadRooms()
        setRooms(roomsList)
      } catch {
        clearAuth()
        window.location.href = '/login'
        return
      } finally {
        setLoading(false)
      }
    }
    init()
  }, [])

  if (loading) {
    return <div className="min-h-screen bg-[#0a0f0d]" />
  }

  const handleJoinRoom = (room: Room) => {
    if (!token) return
    joinRoom(room, token)
  }

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault()
    if (!content.trim() || !activeRoom || !token) return
    sendMessage(activeRoom.id, content.trim(), token)
    setContent("")
  }

  const handleCreateRoom = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newRoomName.trim()) return
    const room = await createRoom(newRoomName)
    setShowCreateRoom(false)
    setNewRoomName("")
    handleJoinRoom(room)
  }

  const activeMessages = activeRoom ? (messages[activeRoom.id] ?? []) : []
  const activeTyping = activeRoom ? (typingUsers[activeRoom.id] ?? []) : []

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [activeMessages.length, activeTyping.length, activeRoom?.id])

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr)
    const now = new Date()
    const isToday = date.toDateString() === now.toDateString()
    const isThisWeek = date >= new Date(now.getFullYear(), now.getMonth(), now.getDate() - 6)
    if (isToday) return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
    if (isThisWeek) return date.toLocaleDateString('en-US', { weekday: 'short' }) + ' ' + date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }

  const renderMessage = (content: string) => {
    if (content.startsWith('[image]')) {
      const url = content.replace('[image]', '')
      return <img src={url} alt="shared" className="max-w-xs rounded-lg cursor-pointer" onClick={() => window.open(url, '_blank')} />
    }
    if (content.startsWith('[file]')) {
      const [name, url] = content.replace('[file]', '').split('|')
      return <a href={url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-green-400 underline">📄 {name}</a>
    }
    return <span>{content}</span>
  }

  return (
    <>
      <Sidebar variant="floating" collapsible="icon">
        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupLabel>Navigate</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton onClick={toggleSidebar}>
                    <Menu />
                  </SidebarMenuButton>
                </SidebarMenuItem>
                {menuItems.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton render={<a href={item.url} />}>
                      <item.icon />
                      <span>{item.title}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>
        <SidebarFooter>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton><Settings /> Settings</SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <DropdownMenu>
                <DropdownMenuTrigger render={<button className="flex items-center gap-2 cursor-pointer p-2 w-full hover:bg-accent rounded-md text-sm bg-transparent border-0 text-left" />}>
                  <User2 className="w-4 h-4" /> {user?.username ?? 'User'}
                  <ChevronUp className="ml-auto w-4 h-4" />
                </DropdownMenuTrigger>
                <DropdownMenuContent side="top" className="w-[--radix-popper-anchor-width]">
                  <DropdownMenuItem>Profile</DropdownMenuItem>
                  <DropdownMenuItem onClick={async () => {
                    try { await api.post('/auth/logout') } catch { /* ignore */ }
                    disconnectSocket()
                    clearSessionCookie()
                    clearAuth()
                    window.location.href = '/login'
                  }}>
                    Sign out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarFooter>
      </Sidebar>

      <SidebarInset>
        <ResizablePanelGroup orientation="horizontal" className="h-screen">
          <ResizablePanel defaultSize={25} minSize={20}>
            <div className="flex flex-col h-screen border ml-1">
              <div className="h-10 px-2 py-4 flex items-center">
                <p className="ml-1 font-semibold">Rooms</p>
                <div className="flex justify-end w-full">
                  <DropdownMenu>
                    <DropdownMenuTrigger render={<button className="cursor-pointer p-2 hover:bg-accent rounded-md bg-transparent border-0" />}>
                      <SquarePen className="w-4 h-4" />
                    </DropdownMenuTrigger>
                    <DropdownMenuContent>
                      <DropdownMenuItem onClick={() => setShowCreateRoom(true)}>
                        <Users /> New Room
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>

              <ScrollArea className="grow">
                {rooms.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
                    <div className="w-12 h-12 rounded-full bg-[#1c2b20] flex items-center justify-center mb-3">
                      <Users className="w-5 h-5 text-[#4ade80]" />
                    </div>
                    <p className="text-sm font-medium text-[#f0fdf4] mb-1">No rooms yet</p>
                    <p className="text-xs text-[#86efac] mb-4">Create one to start chatting</p>
                    <button
                      onClick={() => setShowCreateRoom(true)}
                      className="text-xs bg-[#16a34a] text-[#f0fdf4] px-3 py-1.5 rounded-lg hover:bg-[#14532d] transition"
                    >
                      Create a room
                    </button>
                  </div>
                ) : rooms.map((room) => (
                  <button
                    key={room.id}
                    onClick={() => handleJoinRoom(room)}
                    className={`px-4 w-full py-2 hover:bg-secondary cursor-pointer text-left ${
                      activeRoom?.id === room.id ? 'bg-secondary border-l-2 border-green-500' : ''
                    }`}
                  >
                    <div className="flex flex-row gap-2 items-center">
                      <Avatar className="size-10">
                        <AvatarFallback>{room.name?.[0]?.toUpperCase() ?? '#'}</AvatarFallback>
                      </Avatar>
                      <div>
                        <CardTitle className="text-sm"># {room.name}</CardTitle>
                        <CardDescription className="text-xs truncate">
                          {room.description ?? `${room.members?.length ?? 0} members`}
                        </CardDescription>
                      </div>
                    </div>
                  </button>
                ))}
              </ScrollArea>
            </div>
          </ResizablePanel>

          <ResizableHandle />

          <ResizablePanel defaultSize={75} minSize={40}>
            <div className="flex flex-col h-screen ml-1 pb-2">
              {activeRoom ? (
                <>
                  <div className="h-16 border-b flex items-center px-3">
                    <Avatar className="size-10">
                      <AvatarFallback>{activeRoom.name?.[0]?.toUpperCase() ?? '#'}</AvatarFallback>
                    </Avatar>
                    <div className="space-y-1 ml-2">
                      <CardTitle className="text-sm"># {activeRoom.name}</CardTitle>
                      <CardDescription className="text-xs">
                        {activeRoom.members?.length ?? 0} members
                      </CardDescription>
                    </div>
                    <div className="grow flex justify-end gap-2">
                      <Button variant="ghost" size="icon"><Video /></Button>
                      <Button variant="ghost" size="icon"><Phone /></Button>
                      <Button variant="ghost" size="icon"><Search /></Button>
                    </div>
                  </div>

                  <ScrollArea className="flex-1 p-4">
                    <div className="space-y-4">
                      {activeMessages.map((message) => {
                        const isOwn = message.sender?.id === user?.id
                        return (
                          <div key={message.id} className={`flex gap-3 ${isOwn ? 'flex-row-reverse' : ''}`}>
                            <Avatar className="size-8">
                              <AvatarFallback className="text-xs">
                                {message.sender?.username?.[0]?.toUpperCase() ?? '?'}
                              </AvatarFallback>
                            </Avatar>
                            <div className={`max-w-xs flex flex-col ${isOwn ? 'items-end' : 'items-start'}`}>
                              {!isOwn && (
                                <span className="text-xs text-muted-foreground mb-1">
                                  {message.sender?.username}
                                </span>
                              )}
                              <div className={`px-3 py-2 rounded-2xl text-sm ${
                                isOwn ? 'bg-primary text-primary-foreground' : 'bg-secondary'
                              }`}>
                                {renderMessage(message.content)}
                              </div>
                              <span className="text-xs text-muted-foreground mt-1">
                                {formatTime(message.createdAt)}
                              </span>
                            </div>
                          </div>
                        )
                      })}
                      {activeTyping.length > 0 && (
                        <div className="flex gap-2 items-center text-xs text-muted-foreground">
                          <div className="flex gap-1">
                            {[0, 1, 2].map(i => (
                              <span key={i} className="w-1.5 h-1.5 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />
                            ))}
                          </div>
                          {activeTyping.map(t => t.username).join(', ')} is typing...
                        </div>
                      )}
                      <div ref={bottomRef} />
                    </div>
                  </ScrollArea>

                  <div className="relative">
                    {showEmojis && (
                      <div className="absolute bottom-14 left-4 z-50">
                        <EmojiPicker
                          onEmojiClick={(e) => { setContent(p => p + e.emoji); setShowEmojis(false) }}
                          theme={'dark' as any}
                          height={300}
                          width={280}
                        />
                      </div>
                    )}
                    <form onSubmit={handleSend} className="flex h-12 pt-2 border-t px-2 gap-1">
                      <Button type="button" variant="ghost" size="icon" onClick={() => setShowEmojis(v => !v)}>
                        <Smile />
                      </Button>
                      <Input
                        className="grow border-0 focus-visible:ring-0"
                        placeholder="Type a message"
                        value={content}
                        onChange={(e) => {
                          setContent(e.target.value)
                          if (token && activeRoom) sendTyping(activeRoom.id, true, token)
                        }}
                      />
                      <Button type="submit" variant="ghost" size="icon" disabled={!content.trim()}>
                        <Send />
                      </Button>
                    </form>
                  </div>
                </>
              ) : (
                <div className="flex-1 flex items-center justify-center">
                  <div className="text-center">
                    <p className="text-4xl mb-4">💬</p>
                    <h2 className="font-semibold text-lg mb-2">Welcome to ChatApp</h2>
                    <p className="text-muted-foreground text-sm">Select a room to start chatting</p>
                  </div>
                </div>
              )}
            </div>
          </ResizablePanel>
        </ResizablePanelGroup>
      </SidebarInset>

      {showCreateRoom && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-background rounded-2xl border p-6 w-full max-w-md">
            <h2 className="font-semibold mb-4">Create a new room</h2>
            <form onSubmit={handleCreateRoom} className="space-y-4">
              <Input
                placeholder="Room name"
                value={newRoomName}
                onChange={(e) => setNewRoomName(e.target.value)}
                autoFocus
              />
              <div className="flex gap-3">
                <Button type="button" variant="outline" className="flex-1" onClick={() => setShowCreateRoom(false)}>
                  Cancel
                </Button>
                <Button type="submit" className="flex-1">Create</Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}
