import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Message } from './entities/message.entity';
import { User } from '../users/entities/user.entity';
import { Room } from '../rooms/entities/room.entity';

@Injectable()
export class ChatService {
  constructor(
    @InjectRepository(Message)
    private messagesRepository: Repository<Message>,
  ) {}

  async createMessage(content: string, sender: User, room: Room): Promise<Message> {
    const message = this.messagesRepository.create({ content, sender, room });
    return this.messagesRepository.save(message);
  }

  async getRoomMessages(roomId: string, limit = 50, offset = 0): Promise<Message[]> {
    return this.messagesRepository.find({
      where: { room: { id: roomId } },
      relations: { sender: true },
      order: { createdAt: 'DESC' },
      take: limit,
      skip: offset,
    });
  }

  async deleteMessage(messageId: string, userId: string): Promise<void> {
    const message = await this.messagesRepository.findOne({
      where: { id: messageId },
      relations: { sender: true },
    });
    if (!message) throw new NotFoundException('Message not found');
    if (message.sender.id !== userId) throw new ForbiddenException('You can only delete your own messages');
    await this.messagesRepository.remove(message);
  }

  async getRecentMessages(roomId: string, limit = 30): Promise<Message[]> {
    const messages = await this.messagesRepository.find({
      where: { room: { id: roomId } },
      relations: { sender: true },
      order: { createdAt: 'DESC' },
      take: limit,
    });
    return messages.reverse();
  }
}