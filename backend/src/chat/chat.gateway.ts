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

@WebSocketGateway({
  cors: {
    origin: process.env.FRONTEND_URL ?? 'http://localhost:3000',
    credentials: true,
  },
  namespace: '/',
})
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(ChatGateway.name);

  constructor(
    private chatService: ChatService,
    private roomsService: RoomsService,
    private redisService: RedisService,
    private wsJwtStrategy: WsJwtStrategy,
    private usersService: UsersService,
  ) {}

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

      await this.redisService.setUserOnline(user.id, client.id);
      await this.usersService.update(user.id, { isOnline: true });

      this.server.emit('user:online', { userId: user.id, username: user.username });
      this.logger.log(`Client connected: ${user.username} (${client.id})`);
    } catch {
      client.disconnect();
    }
  }

  async handleDisconnect(client: Socket) {
    const user = client.data.user;
    if (!user) return;

    await this.redisService.setUserOffline(user.id);
    await this.usersService.update(user.id, {
      isOnline: false,
      lastSeen: new Date(),
    });

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
      const room = await this.roomsService.join(data.roomId, user);
      client.join(data.roomId);

      const messages = await this.chatService.getRecentMessages(data.roomId);
      client.emit('room:history', { roomId: data.roomId, messages });

      client.to(data.roomId).emit('room:user_joined', {
        roomId: data.roomId,
        user: { id: user.id, username: user.username },
      });

      return { success: true, room };
    } catch (error) {
      throw new WsException(error.message);
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
      const room = await this.roomsService.findOne(data.roomId);

      const message = await this.chatService.createMessage(
        data.content, user, room,
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
      throw new WsException(error.message);
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
      const user = client.data.user;
      const room = await this.roomsService.create(
        { name: data.name, description: data.description, type: 'public' as any },
        user,
      );
      this.server.emit('room:new', room);
      return { success: true, room };
    } catch (error) {
      throw new WsException(error.message);
    }
  }

  @UseGuards(WsJwtGuard)
  @SubscribeMessage('users:online')
  async handleGetOnlineUsers(@ConnectedSocket() client: Socket) {
    const onlineUsers = await this.redisService.getOnlineUsers();
    client.emit('users:online', onlineUsers);
  }
}