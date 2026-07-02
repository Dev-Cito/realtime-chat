import {
  WebSocketGateway, WebSocketServer, SubscribeMessage,
  OnGatewayConnection, OnGatewayDisconnect, ConnectedSocket,
  MessageBody, WsException,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { UseGuards, Logger } from '@nestjs/common';
import { ChatService } from './chat.service';
import { RoomsService } from '../rooms/rooms.service';
import { RedisService } from '../redis/redis.service';
import { WsJwtGuard } from '../auth/guards/ws-jwt.guard';
import { WsJwtStrategy } from '../auth/strategies/ws-jwt.strategy';
import { UsersService } from '../users/users.service';
import { RoomType } from '../rooms/entities/room.entity';

const ALLOWED_ORIGINS = [
  process.env.FRONTEND_URL ?? 'http://localhost:3000',
  'http://localhost:3000',
  /\.vercel\.app$/,
];

@WebSocketGateway({
  cors: {
    origin: (origin: string, callback: (err: Error | null, allow?: boolean) => void) => {
      if (!origin) return callback(null, true);
      const allowed = ALLOWED_ORIGINS.some((o) =>
        typeof o === 'string' ? o === origin : o.test(origin),
      );
      callback(allowed ? null : new Error('Not allowed by CORS'), allowed);
    },
    credentials: true,
  },
  namespace: '/',
})
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(ChatGateway.name);

  // Per-user rate limit: max 30 messages/minute
  private readonly msgRateLimit = new Map<string, { count: number; resetAt: number }>();

  constructor(
    private chatService: ChatService,
    private roomsService: RoomsService,
    private redisService: RedisService,
    private wsJwtStrategy: WsJwtStrategy,
    private usersService: UsersService,
  ) {}

  private checkRateLimit(userId: string, max = 30): boolean {
    const now = Date.now();
    const entry = this.msgRateLimit.get(userId);
    if (!entry || now > entry.resetAt) {
      this.msgRateLimit.set(userId, { count: 1, resetAt: now + 60_000 });
      return true;
    }
    if (entry.count >= max) return false;
    entry.count++;
    return true;
  }

  async handleConnection(client: Socket) {
    try {
      const token =
        client.handshake.auth?.token ||
        client.handshake.headers?.authorization?.split(' ')[1];

      if (!token) {
        client.disconnect();
        return;
      }

      const user = await this.wsJwtStrategy.validate(token);
      client.data.user = user;

      // Personal channel — used to push notifications (new DMs, etc.) directly to this user
      client.join(`user:${user.id}`);

      await this.redisService.setUserOnline(user.id, client.id);
      await this.usersService.update(user.id, { isOnline: true });

      this.server.emit('user:online', { userId: user.id, username: user.username });
      this.logger.log(`Client connected: ${user.username} (${client.id})`);
    } catch (err) {
      this.logger.error(`Connection rejected: ${(err as Error).message}`);
      client.disconnect();
    }
  }

  async handleDisconnect(client: Socket) {
    const user = client.data.user;
    if (!user) return;

    try {
      await this.redisService.setUserOffline(user.id);
    } catch (err) {
      this.logger.error(`Redis setUserOffline failed for ${user.id}: ${(err as Error).message}`);
    }

    try {
      await this.usersService.update(user.id, { isOnline: false, lastSeen: new Date() });
    } catch (err) {
      this.logger.error(`DB update on disconnect failed for ${user.id}: ${(err as Error).message}`);
    }

    this.server.emit('user:offline', { userId: user.id, username: user.username });
    this.logger.log(`Client disconnected: ${user.username} (${client.id})`);
  }

  @UseGuards(WsJwtGuard)
  @SubscribeMessage('room:join')
  async handleJoinRoom(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { roomId: string },
  ) {
    try {
      const user = client.data.user;
      const room = await this.roomsService.findOne(data.roomId);

      // Private rooms: only existing members can join
      if (room.type === RoomType.PRIVATE) {
        const isMember = room.members.some((m) => m.id === user.id);
        if (!isMember) throw new WsException('Access denied: private room');
      }

      await this.roomsService.join(data.roomId, user);
      client.join(data.roomId);

      const messages = await this.chatService.getRecentMessages(data.roomId);
      client.emit('room:history', { roomId: data.roomId, messages });

      client.to(data.roomId).emit('room:user_joined', {
        roomId: data.roomId,
        user: { id: user.id, username: user.username },
      });

      // For DM rooms: notify the other member so the room appears in their list in real-time
      if (room.type === RoomType.DIRECT) {
        room.members
          .filter((m) => m.id !== user.id)
          .forEach((m) => {
            this.server.to(`user:${m.id}`).emit('room:new', room);
          });
      }

      return { success: true, room };
    } catch (error) {
      throw new WsException((error as Error).message);
    }
  }

  @UseGuards(WsJwtGuard)
  @SubscribeMessage('room:leave')
  async handleLeaveRoom(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { roomId: string },
  ) {
    const user = client.data.user;
    client.leave(data.roomId);

    client.to(data.roomId).emit('room:user_left', {
      roomId: data.roomId,
      user: { id: user.id, username: user.username },
    });

    return { success: true };
  }

  @UseGuards(WsJwtGuard)
  @SubscribeMessage('message:send')
  async handleMessage(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { roomId: string; content: string },
  ) {
    try {
      const user = client.data.user;

      // Input validation
      if (!data.content || typeof data.content !== 'string' || !data.content.trim()) {
        throw new WsException('Message content cannot be empty');
      }
      if (data.content.length > 4000) {
        throw new WsException('Message exceeds maximum length of 4000 characters');
      }

      // Rate limiting
      if (!this.checkRateLimit(user.id)) {
        throw new WsException('Rate limit exceeded: too many messages');
      }

      const room = await this.roomsService.findOne(data.roomId);

      // Membership check — user must belong to the room
      const isMember = room.members.some((m) => m.id === user.id);
      if (!isMember) throw new WsException('You are not a member of this room');

      const message = await this.chatService.createMessage(
        data.content.trim(), user, room,
      );

      const messagePayload = {
        id: message.id,
        content: message.content,
        sender: { id: user.id, username: user.username },
        roomId: data.roomId,
        createdAt: message.createdAt,
      };

      this.server.to(data.roomId).emit('message:new', messagePayload);
      return { success: true, message: messagePayload };
    } catch (error) {
      throw new WsException((error as Error).message);
    }
  }

  @UseGuards(WsJwtGuard)
  @SubscribeMessage('message:typing')
  handleTyping(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { roomId: string; isTyping: boolean },
  ) {
    const user = client.data.user;
    client.to(data.roomId).emit('message:typing', {
      userId: user.id,
      username: user.username,
      isTyping: data.isTyping,
      roomId: data.roomId,
    });
  }

  @UseGuards(WsJwtGuard)
  @SubscribeMessage('room:create')
  async handleCreateRoom(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { name: string; description?: string },
  ) {
    try {
      if (!data.name || typeof data.name !== 'string' || !data.name.trim()) {
        throw new WsException('Room name cannot be empty');
      }
      const user = client.data.user;
      const room = await this.roomsService.create(
        { name: data.name.trim(), description: data.description?.trim(), type: RoomType.PUBLIC },
        user,
      );
      this.server.emit('room:new', room);
      return { success: true, room };
    } catch (error) {
      throw new WsException((error as Error).message);
    }
  }

  @UseGuards(WsJwtGuard)
  @SubscribeMessage('users:online')
  async handleGetOnlineUsers(@ConnectedSocket() client: Socket) {
    const onlineUsers = await this.redisService.getOnlineUsers();
    client.emit('users:online', onlineUsers);
  }
}
