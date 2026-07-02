"use client"

import React, { useEffect, useRef, useState } from "react"
import {
  SidebarInset, Sidebar, SidebarContent, SidebarGroup,
  SidebarGroupContent, SidebarMenu,
  SidebarMenuButton, SidebarMenuItem, SidebarFooter, useSidebar,
} from "@/components/blocks/sidebar"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { CardDescription, CardTitle } from "@/components/ui/card"
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@/components/ui/resizable"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Menu, MessageCircle, ChevronUp, Search, Send, Smile, SquarePen, Users, UserRound, ArrowLeft, X, FileIcon } from "lucide-react"
import dynamic from "next/dynamic"
import { useShallow } from "zustand/react/shallow"
import { useAuthStore } from "@/store/auth.store"
import { useChatStore } from "@/store/chat.store"
import { useChat } from "@/hooks/useChat"
import { useSocket } from "@/hooks/useSocket"
import { useIsMobile } from "@/hooks/use-mobile"
import { Room, User } from "@/types"
import { api } from "@/lib/api"
import { disconnectSocket } from "@/lib/socket"
import { clearSessionCookie } from "@/lib/session"

const EmojiPicker = dynamic(() => import("emoji-picker-react"), { ssr: false })

export const ChatTemplate = () => {
  const { toggleSidebar } = useSidebar()
  const isMobile = useIsMobile()
  const { user, token, setAuth, clearAuth } = useAuthStore(
    useShallow((s) => ({ user: s.user, token: s.token, setAuth: s.setAuth, clearAuth: s.clearAuth }))
  )
  const { rooms, activeRoom, messages, typingUsers, setRooms, setActiveRoom } = useChatStore(
    useShallow((s) => ({
      rooms: s.rooms,
      activeRoom: s.activeRoom,
      messages: s.messages,
      typingUsers: s.typingUsers,
      setRooms: s.setRooms,
      setActiveRoom: s.setActiveRoom,
    }))
  )
  const { joinRoom, sendMessage, sendTyping, createRoom, loadRooms, loadPublicRooms, createDirectRoom } = useChat()
  useSocket(token)

  const bottomRef = useRef<HTMLDivElement>(null)
  const mobileBottomRef = useRef<HTMLDivElement>(null)

  const [loading, setLoading] = useState(true)
  const [content, setContent] = useState("")
  const [showEmojis, setShowEmojis] = useState(false)
  const [showCreateRoom, setShowCreateRoom] = useState(false)
  const [newRoomName, setNewRoomName] = useState("")
  const [newRoomDescription, setNewRoomDescription] = useState("")
  const [showNewDM, setShowNewDM] = useState(false)
  const [dmUsers, setDmUsers] = useState<User[]>([])
  const [dmLoading, setDmLoading] = useState(false)
  const [publicRooms, setPublicRooms] = useState<Room[]>([])

  const activeMessages = activeRoom ? (messages[activeRoom.id] ?? []) : []
  const activeTyping = activeRoom ? (typingUsers[activeRoom.id] ?? []) : []

  useEffect(() => {
    const init = async () => {
      try {
        const meRes = await api.get('/auth/me')
        // /auth/me now returns a fresh token alongside the user — no localStorage needed
        const { token: freshToken, ...userData } = meRes.data.data
        setAuth(userData, freshToken)
        const [roomsList, allPublic] = await Promise.all([loadRooms(), loadPublicRooms()])
        setRooms(roomsList)
        // Public rooms the user hasn't joined yet
        const memberIds = new Set(roomsList.map((r) => r.id))
        setPublicRooms(allPublic.filter((r) => !memberIds.has(r.id)))
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

  useEffect(() => {
    // Two refs: mobile and desktop panels never coexist in DOM (isMobile gates each)
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
    mobileBottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [activeMessages.length, activeTyping.length, activeRoom?.id])

  if (loading) {
    return <div className="min-h-screen bg-[#0a0f0d]" />
  }

  // ── Handlers ───────────────────────────────────────────────────────────────

  const handleJoinRoom = (room: Room) => {
    const currentToken = token ?? useAuthStore.getState().token ?? ''
    joinRoom(room, currentToken)
  }

  const handleJoinPublicRoom = (room: Room) => {
    const currentToken = token ?? useAuthStore.getState().token ?? ''
    // Optimistically move room into user's list
    setRooms([room, ...rooms.filter((r) => r.id !== room.id)])
    setPublicRooms((prev) => prev.filter((r) => r.id !== room.id))
    joinRoom(room, currentToken)
  }

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault()
    if (!content.trim() || !activeRoom) return
    const currentToken = token ?? useAuthStore.getState().token ?? ''
    console.log('sending message', { roomId: activeRoom.id, content: content.trim() })
    sendMessage(activeRoom.id, content.trim(), currentToken)
    setContent("")
  }

  const handleCreateRoom = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newRoomName.trim()) return
    try {
      const room = await createRoom(newRoomName, newRoomDescription.trim() || undefined)
      setShowCreateRoom(false)
      setNewRoomName("")
      setNewRoomDescription("")
      // Re-fetch rooms so list is fresh (createRoom broadcasts room:new but may lack members)
      const updated = await loadRooms()
      setRooms(updated)
      handleJoinRoom(room)
    } catch (err) {
      console.error('Failed to create room:', err)
    }
  }

  const handleOpenNewDM = async () => {
    setShowNewDM(true)
    setDmLoading(true)
    try {
      const res = await api.get('/users')
      const all: User[] = res.data.data ?? res.data
      setDmUsers(all.filter((u) => u.id !== user?.id))
    } catch {
      setDmUsers([])
    } finally {
      setDmLoading(false)
    }
  }

  const handleStartDM = async (target: User) => {
    setShowNewDM(false)
    try {
      const room = await createDirectRoom(target.id)
      // Re-fetch so the DM appears with full member data
      const updated = await loadRooms()
      setRooms([room, ...updated.filter((r) => r.id !== room.id)])
      handleJoinRoom(room)
    } catch (err) {
      console.error('Failed to create DM:', err)
    }
  }

  const handleSignOut = async () => {
    try { await api.post('/auth/logout') } catch { /* ignore */ }
    disconnectSocket()
    clearSessionCookie()
    clearAuth()
    window.location.href = '/login'
  }

  // ── Helpers ─────────────────────────────────────────────────────────────────

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr)
    const now = new Date()
    const isToday = date.toDateString() === now.toDateString()
    const isThisWeek = date >= new Date(now.getFullYear(), now.getMonth(), now.getDate() - 6)
    if (isToday) return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
    if (isThisWeek) return date.toLocaleDateString('en-US', { weekday: 'short' }) + ' ' + date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }

  const isSafeUrl = (url: string) => /^https?:\/\//i.test(url.trim())

  const renderMessage = (msgContent: string) => {
    if (msgContent.startsWith('[image]')) {
      const url = msgContent.replace('[image]', '').trim()
      if (!isSafeUrl(url)) return <span>{msgContent}</span>
      return <img src={url} alt="shared" className="max-w-xs rounded-lg cursor-pointer" onClick={() => window.open(url, '_blank')} />
    }
    if (msgContent.startsWith('[file]')) {
      const [name, url] = msgContent.replace('[file]', '').split('|')
      if (!isSafeUrl(url)) return <span>{msgContent}</span>
      return (
        <a href={url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-green-400 underline">
          <FileIcon className="w-4 h-4 shrink-0" />{name}
        </a>
      )
    }
    return <span>{msgContent}</span>
  }

  const getRoomDisplayName = (room: Room) => {
    if (room.type === 'direct') {
      return room.members?.find((m) => m.id !== user?.id)?.username ?? 'Direct Message'
    }
    return `# ${room.name}`
  }

  const getRoomInitial = (room: Room) => {
    if (room.type === 'direct') {
      return room.members?.find((m) => m.id !== user?.id)?.username?.[0]?.toUpperCase() ?? '?'
    }
    return room.name?.[0]?.toUpperCase() ?? '#'
  }

  // ── Shared pieces ───────────────────────────────────────────────────────────

  const roomItem = (room: Room) => (
    <button
      key={room.id}
      onClick={() => handleJoinRoom(room)}
      className={`px-4 w-full py-3 hover:bg-secondary cursor-pointer text-left transition-colors ${
        activeRoom?.id === room.id ? 'bg-secondary border-l-2 border-green-500' : ''
      }`}
    >
      <div className="flex items-center gap-3">
        <Avatar className="size-10 shrink-0">
          <AvatarFallback>{getRoomInitial(room)}</AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <CardTitle className="text-sm truncate">{getRoomDisplayName(room)}</CardTitle>
          <CardDescription className="text-xs truncate">
            {room.type === 'direct' ? 'Direct Message' : (room.description ?? `${room.members?.length ?? 0} members`)}
          </CardDescription>
        </div>
      </div>
    </button>
  )

  const messageInput = (
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
      <form onSubmit={handleSend} className="flex h-12 pt-2 border-t border-[#1e3327] px-2 gap-1">
        <Button type="button" variant="ghost" size="icon" aria-label="Open emoji picker" onClick={() => setShowEmojis(v => !v)}>
          <Smile className="w-4 h-4" />
        </Button>
        <Input
          className="grow border-0 focus-visible:ring-0"
          placeholder="Type a message"
          value={content}
          onChange={(e) => {
            setContent(e.target.value)
            const t = token ?? useAuthStore.getState().token ?? ''
            if (t && activeRoom) sendTyping(activeRoom.id, true, t)
          }}
        />
        <Button type="submit" variant="ghost" size="icon" aria-label="Send message" disabled={!content.trim()}>
          <Send className="w-4 h-4" />
        </Button>
      </form>
    </div>
  )

  const messageList = (
    <ScrollArea className="flex-1 p-4">
      <div className="space-y-4">
        {activeMessages.map((message) => {
          const isOwn = message.sender?.id === user?.id
          return (
            <div key={message.id} className={`flex gap-3 ${isOwn ? 'flex-row-reverse' : ''}`}>
              <Avatar className="size-8 shrink-0">
                <AvatarFallback className="text-xs">
                  {message.sender?.username?.[0]?.toUpperCase() ?? '?'}
                </AvatarFallback>
              </Avatar>
              <div className={`max-w-[70%] flex flex-col ${isOwn ? 'items-end' : 'items-start'}`}>
                {!isOwn && (
                  <span className="text-xs text-muted-foreground mb-1">{message.sender?.username}</span>
                )}
                <div className={`px-3 py-2 rounded-2xl text-sm ${isOwn ? 'bg-primary text-primary-foreground' : 'bg-secondary'}`}>
                  {renderMessage(message.content)}
                </div>
                <span className="text-xs text-muted-foreground mt-1">{formatTime(message.createdAt)}</span>
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
  )

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <>
      {/* ══════════════════════════════════════════════════════════════════════
          MOBILE LAYOUT — React conditional, not CSS hiding.
          position:fixed inside display:none leaks on iOS Safari.
      ══════════════════════════════════════════════════════════════════════ */}

      {/* ── Mobile: rooms list (no active room) ─── */}
      {isMobile && !activeRoom && (
        <div className="flex flex-col bg-[#0a0f0d] w-full h-dvh overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-4 border-b border-[#1e3327] shrink-0">
            <h1 className="text-[#f0fdf4] font-semibold text-lg">CitChat</h1>
            <button
              onClick={() => setShowCreateRoom(true)}
              className="p-1 rounded-md hover:bg-[#1c2b20] transition"
            >
              <SquarePen className="w-5 h-5 text-[#86efac]" />
            </button>
          </div>

          {/* Rooms list — flex-1 so the bottom nav sits naturally at the bottom */}
          <div className="flex-1 overflow-y-auto">
            {rooms.length === 0 && publicRooms.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
                <div className="w-14 h-14 rounded-full bg-[#1c2b20] flex items-center justify-center mb-4">
                  <Users className="w-6 h-6 text-[#4ade80]" />
                </div>
                <p className="text-sm font-medium text-[#f0fdf4] mb-1">No chats yet</p>
                <p className="text-xs text-[#86efac] mb-5">Create a room or send a DM</p>
                <button
                  onClick={() => setShowCreateRoom(true)}
                  className="text-xs bg-[#16a34a] text-[#f0fdf4] px-4 py-2 rounded-lg hover:bg-[#14532d] transition"
                >
                  Create a room
                </button>
              </div>
            ) : (
              <>
                {rooms.map(roomItem)}
                {publicRooms.length > 0 && (
                  <>
                    <p className="px-4 pt-4 pb-1 text-[10px] font-semibold uppercase tracking-widest text-[#4a7c59]">Public Rooms</p>
                    {publicRooms.map((room) => (
                      <button
                        key={room.id}
                        onClick={() => handleJoinPublicRoom(room)}
                        className="px-4 w-full py-3 hover:bg-secondary cursor-pointer text-left transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <Avatar className="size-10 shrink-0">
                            <AvatarFallback>{room.name?.[0]?.toUpperCase() ?? '#'}</AvatarFallback>
                          </Avatar>
                          <div className="min-w-0 flex-1">
                            <CardTitle className="text-sm truncate"># {room.name}</CardTitle>
                            <CardDescription className="text-xs truncate">{room.members?.length ?? 0} members · tap to join</CardDescription>
                          </div>
                        </div>
                      </button>
                    ))}
                  </>
                )}
              </>
            )}
          </div>

          {/* Bottom nav — shrink-0, NOT fixed (fixed bleeds over other panels) */}
          <div className="shrink-0 bg-[#111a15] border-t border-[#1e3327] flex items-center justify-around py-3 px-6">
            <button onClick={() => setActiveRoom(null)} className="flex flex-col items-center gap-0.5 text-green-400">
              <MessageCircle className="w-5 h-5" />
              <span className="text-[10px]">Chats</span>
            </button>

            <button
              onClick={handleOpenNewDM}
              className="flex flex-col items-center gap-0.5 text-[#86efac] hover:text-green-400 transition"
            >
              <UserRound className="w-5 h-5" />
              <span className="text-[10px]">New DM</span>
            </button>

            <DropdownMenu>
              <DropdownMenuTrigger render={
                <button className="flex flex-col items-center gap-0.5 text-[#86efac] hover:text-green-400 transition bg-transparent border-0" />
              }>
                <div className="w-7 h-7 rounded-full bg-[#1D9E75] flex items-center justify-center text-white text-xs font-medium">
                  {user?.username?.[0]?.toUpperCase() ?? 'U'}
                </div>
                <span className="text-[10px]">Me</span>
              </DropdownMenuTrigger>
              <DropdownMenuContent side="top" className="w-44">
                <DropdownMenuItem className="text-red-400" onClick={handleSignOut}>Sign out</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      )}

      {/* ── Mobile: chat panel (active room) ─── */}
      {isMobile && activeRoom && (
        <div className="flex flex-col bg-[#0a0f0d] w-full h-dvh overflow-hidden">
          {/* Chat header */}
          <div className="flex items-center gap-3 px-4 py-3 border-b border-[#1e3327] shrink-0">
            <button
              onClick={() => setActiveRoom(null)}
              className="p-1 rounded-md hover:bg-[#1c2b20] transition"
            >
              <ArrowLeft className="w-5 h-5 text-[#86efac]" />
            </button>
            <div className="w-8 h-8 rounded-full bg-[#1D9E75] flex items-center justify-center text-white text-xs font-medium shrink-0">
              {getRoomInitial(activeRoom)}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[#f0fdf4] text-sm font-medium truncate">{getRoomDisplayName(activeRoom)}</p>
              <p className="text-[#86efac] text-xs">
                {activeRoom.type === 'direct' ? 'Direct Message' : `${activeRoom.members?.length ?? 0} members`}
              </p>
            </div>
            <Button variant="ghost" size="icon"><Search className="w-4 h-4" /></Button>
          </div>

          {/* Messages — flex-1 with overflow scroll */}
          <div className="flex-1 overflow-y-auto p-4">
            <div className="space-y-4">
              {activeMessages.map((message) => {
                const isOwn = message.sender?.id === user?.id
                return (
                  <div key={message.id} className={`flex gap-2 ${isOwn ? 'flex-row-reverse' : ''}`}>
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center text-white text-[10px] font-medium shrink-0 ${isOwn ? 'bg-[#1D9E75]' : 'bg-[#2d4a35]'}`}>
                      {message.sender?.username?.[0]?.toUpperCase() ?? '?'}
                    </div>
                    <div className={`max-w-[75%] flex flex-col ${isOwn ? 'items-end' : 'items-start'}`}>
                      {!isOwn && (
                        <span className="text-[11px] text-[#86efac] mb-0.5">{message.sender?.username}</span>
                      )}
                      <div className={`px-3 py-2 rounded-2xl text-sm leading-relaxed ${isOwn ? 'bg-[#1D9E75] text-white rounded-tr-sm' : 'bg-[#1c2b20] text-[#f0fdf4] rounded-tl-sm'}`}>
                        {renderMessage(message.content)}
                      </div>
                      <span className="text-[10px] text-[#4a7c59] mt-1">{formatTime(message.createdAt)}</span>
                    </div>
                  </div>
                )
              })}
              {activeTyping.length > 0 && (
                <div className="flex gap-2 items-center text-xs text-[#86efac]">
                  <div className="flex gap-1">
                    {[0, 1, 2].map(i => (
                      <span key={i} className="w-1.5 h-1.5 bg-[#86efac] rounded-full animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />
                    ))}
                  </div>
                  {activeTyping.map(t => t.username).join(', ')} is typing...
                </div>
              )}
              <div ref={mobileBottomRef} />
            </div>
          </div>

          {/* Input — shrink-0, always visible above keyboard */}
          <div className="shrink-0 border-t border-[#1e3327] bg-[#0a0f0d]">
            {showEmojis && (
              <div className="absolute bottom-16 left-4 z-50">
                <EmojiPicker
                  onEmojiClick={(e) => { setContent(p => p + e.emoji); setShowEmojis(false) }}
                  theme={'dark' as any}
                  height={280}
                  width={Math.min(300, typeof window !== 'undefined' ? window.innerWidth - 32 : 300)}
                />
              </div>
            )}
            <form onSubmit={handleSend} className="flex items-center h-12 px-2 gap-1">
              <Button type="button" variant="ghost" size="icon" aria-label="Open emoji picker" onClick={() => setShowEmojis(v => !v)}>
                <Smile className="w-4 h-4" />
              </Button>
              <input
                className="flex-1 bg-transparent text-[#f0fdf4] placeholder-[#4a7c59] text-sm outline-none"
                placeholder="Type a message"
                value={content}
                onChange={(e) => {
                  setContent(e.target.value)
                  const t = token ?? useAuthStore.getState().token ?? ''
                  if (t && activeRoom) sendTyping(activeRoom.id, true, t)
                }}
              />
              <Button type="submit" variant="ghost" size="icon" aria-label="Send message" disabled={!content.trim()}>
                <Send className="w-4 h-4" />
              </Button>
            </form>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          DESKTOP LAYOUT — only rendered when not mobile (never in DOM on phones)
      ══════════════════════════════════════════════════════════════════════ */}
      {!isMobile && <div className="flex h-screen w-full">
        <Sidebar variant="floating" collapsible="icon">
          <SidebarContent>
            <SidebarGroup>
              <SidebarGroupContent>
                <SidebarMenu>
                  <SidebarMenuItem>
                    <SidebarMenuButton onClick={toggleSidebar} tooltip="Toggle">
                      <Menu />
                    </SidebarMenuButton>
                  </SidebarMenuItem>

                  <SidebarMenuItem>
                    <SidebarMenuButton tooltip="Chats" isActive onClick={() => setActiveRoom(null)}>
                      <MessageCircle />
                      <span>Chats</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>

                  <SidebarMenuItem>
                    <SidebarMenuButton tooltip="New DM" onClick={handleOpenNewDM}>
                      <UserRound />
                      <span>New DM</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          </SidebarContent>

          <SidebarFooter>
            <SidebarMenu>
              <SidebarMenuItem>
                <DropdownMenu>
                  <DropdownMenuTrigger render={
                    <button className="flex items-center gap-2 cursor-pointer p-2 w-full hover:bg-accent rounded-md text-sm bg-transparent border-0 text-left" />
                  }>
                    <div className="w-6 h-6 rounded-full bg-[#1D9E75] flex items-center justify-center text-white text-xs font-medium shrink-0">
                      {user?.username?.[0]?.toUpperCase() ?? 'U'}
                    </div>
                    <span className="truncate">{user?.username ?? 'User'}</span>
                    <ChevronUp className="ml-auto w-4 h-4 shrink-0" />
                  </DropdownMenuTrigger>
                  <DropdownMenuContent side="top" className="w-48">
                    <DropdownMenuItem className="text-red-400" onClick={handleSignOut}>Sign out</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarFooter>
        </Sidebar>

        <SidebarInset className="flex-1 overflow-hidden">
          <ResizablePanelGroup orientation="horizontal" className="h-screen">

            {/* Rooms list */}
            <ResizablePanel defaultSize={30} minSize={25}>
              <div className="flex flex-col h-full border-r border-[#1e3327]">
                <div className="h-14 px-3 flex items-center border-b border-[#1e3327] shrink-0">
                  <p className="font-semibold flex-1">Chats</p>
                  <DropdownMenu>
                    <DropdownMenuTrigger render={<button className="cursor-pointer p-2 hover:bg-accent rounded-md bg-transparent border-0" />}>
                      <SquarePen className="w-4 h-4" />
                    </DropdownMenuTrigger>
                    <DropdownMenuContent>
                      <DropdownMenuItem onClick={() => setShowCreateRoom(true)}>
                        <Users className="w-4 h-4 mr-2" /> New Room
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={handleOpenNewDM}>
                        <UserRound className="w-4 h-4 mr-2" /> New DM
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

                <ScrollArea className="flex-1">
                  {rooms.length === 0 && publicRooms.length === 0 ? (
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
                  ) : (
                    <>
                      {rooms.map(roomItem)}
                      {publicRooms.length > 0 && (
                        <>
                          <p className="px-4 pt-4 pb-1 text-[10px] font-semibold uppercase tracking-widest text-[#4a7c59]">Public Rooms</p>
                          {publicRooms.map((room) => (
                            <button
                              key={room.id}
                              onClick={() => handleJoinPublicRoom(room)}
                              className="px-4 w-full py-3 hover:bg-secondary cursor-pointer text-left transition-colors"
                            >
                              <div className="flex items-center gap-3">
                                <Avatar className="size-10 shrink-0">
                                  <AvatarFallback>{room.name?.[0]?.toUpperCase() ?? '#'}</AvatarFallback>
                                </Avatar>
                                <div className="min-w-0 flex-1">
                                  <CardTitle className="text-sm truncate"># {room.name}</CardTitle>
                                  <CardDescription className="text-xs truncate">{room.members?.length ?? 0} members · tap to join</CardDescription>
                                </div>
                              </div>
                            </button>
                          ))}
                        </>
                      )}
                    </>
                  )}
                </ScrollArea>
              </div>
            </ResizablePanel>

            <ResizableHandle />

            {/* Chat panel */}
            <ResizablePanel defaultSize={70} minSize={40}>
              <div className="flex flex-col h-full">
                {activeRoom ? (
                  <>
                    {/* Desktop chat header — no Video/Phone buttons */}
                    <div className="h-14 border-b border-[#1e3327] flex items-center px-4 gap-3 shrink-0">
                      <Avatar className="size-9 shrink-0">
                        <AvatarFallback>{getRoomInitial(activeRoom)}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <CardTitle className="text-sm truncate">{getRoomDisplayName(activeRoom)}</CardTitle>
                        <CardDescription className="text-xs">
                          {activeRoom.type === 'direct' ? 'Direct Message' : `${activeRoom.members?.length ?? 0} members`}
                        </CardDescription>
                      </div>
                      <Button variant="ghost" size="icon"><Search className="w-4 h-4" /></Button>
                    </div>

                    {messageList}
                    {messageInput}
                  </>
                ) : (
                  <div className="flex-1 flex items-center justify-center">
                    <div className="text-center">
                      <p className="text-4xl mb-4">💬</p>
                      <h2 className="font-semibold text-lg mb-2">Welcome to CitChat</h2>
                      <p className="text-muted-foreground text-sm">Select a room to start chatting</p>
                    </div>
                  </div>
                )}
              </div>
            </ResizablePanel>

          </ResizablePanelGroup>
        </SidebarInset>
      </div>}

      {/* ── Create room modal ─────────────────────────────────────────────────── */}
      {showCreateRoom && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 px-4">
          <div className="bg-[#111a15] rounded-2xl border border-[#1e3327] p-6 w-full max-w-md">
            <h2 className="font-semibold mb-4 text-[#f0fdf4]">Create a new room</h2>
            <form onSubmit={handleCreateRoom} className="space-y-3">
              <Input
                placeholder="Room name"
                value={newRoomName}
                onChange={(e) => setNewRoomName(e.target.value)}
                autoFocus
              />
              <textarea
                placeholder="Description (optional)"
                value={newRoomDescription}
                onChange={(e) => setNewRoomDescription(e.target.value)}
                rows={2}
                className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm text-[#f0fdf4] placeholder:text-muted-foreground resize-none outline-none focus:ring-1 focus:ring-[#1D9E75]"
              />
              <div className="flex gap-3">
                <Button type="button" variant="outline" className="flex-1" onClick={() => { setShowCreateRoom(false); setNewRoomDescription("") }}>
                  Cancel
                </Button>
                <Button type="submit" className="flex-1">Create</Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── New DM modal ──────────────────────────────────────────────────────── */}
      {showNewDM && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 px-4">
          <div className="bg-[#111a15] rounded-2xl border border-[#1e3327] w-full max-w-sm flex flex-col max-h-[70vh]">
            <div className="flex items-center justify-between px-5 py-4 border-b border-[#1e3327] shrink-0">
              <h2 className="font-semibold text-[#f0fdf4]">New Direct Message</h2>
              <button onClick={() => setShowNewDM(false)} className="p-1 hover:bg-accent rounded-md">
                <X className="w-4 h-4" />
              </button>
            </div>

            <ScrollArea className="flex-1">
              {dmLoading ? (
                <div className="py-10 text-center text-sm text-[#86efac]">Loading users…</div>
              ) : dmUsers.length === 0 ? (
                <div className="py-10 text-center text-sm text-[#86efac]">No other users found</div>
              ) : dmUsers.map((u) => (
                <button
                  key={u.id}
                  onClick={() => handleStartDM(u)}
                  className="w-full flex items-center gap-3 px-5 py-3 hover:bg-[#1c2b20] transition text-left"
                >
                  <div className="w-9 h-9 rounded-full bg-[#1D9E75] flex items-center justify-center text-white text-sm font-medium shrink-0">
                    {u.username?.[0]?.toUpperCase() ?? '?'}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-[#f0fdf4]">{u.username}</p>
                    <p className="text-xs text-[#86efac]">{u.isOnline ? '🟢 Online' : 'Offline'}</p>
                  </div>
                </button>
              ))}
            </ScrollArea>
          </div>
        </div>
      )}
    </>
  )
}
