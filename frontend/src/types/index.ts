export interface User {
  id: string;
  email: string;
  username: string;
  avatar?: string;
  isOnline: boolean;
  lastSeen?: string;
  createdAt: string;
}

export interface Room {
  id: string;
  name?: string;
  description?: string;
  type: 'public' | 'private' | 'direct';
  createdBy?: User;
  members: User[];
  createdAt: string;
  updatedAt: string;
}

export interface Message {
  id: string;
  content: string;
  sender: User;
  roomId: string;
  createdAt: string;
  isEdited?: boolean;
}

export interface ApiResponse<T> {
  statusCode: number;
  message: string;
  data: T;
  timestamp: string;
}

export interface TypingUser {
  userId: string;
  username: string;
  roomId: string;
  isTyping: boolean;
}