import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Room, RoomType } from './entities/room.entity';
import { CreateRoomDto } from './dto/create-room.dto';
import { User } from '../users/entities/user.entity';

@Injectable()
export class RoomsService {
  constructor(
    @InjectRepository(Room)
    private roomsRepository: Repository<Room>,
  ) {}

  async create(dto: CreateRoomDto, creator: User): Promise<Room> {
    const room = this.roomsRepository.create({
      ...dto,
      createdBy: creator,
      members: [creator],
    });
    return this.roomsRepository.save(room);
  }

  async findAll(limit = 50, offset = 0): Promise<Room[]> {
    return this.roomsRepository.find({
      where: { type: RoomType.PUBLIC },
      relations: { members: true, createdBy: true },
      order: { createdAt: 'DESC' },
      take: limit,
      skip: offset,
    });
  }

  async findOne(id: string): Promise<Room> {
    const room = await this.roomsRepository.findOne({
      where: { id },
      relations: { members: true, createdBy: true },
    });
    if (!room) throw new NotFoundException('Room not found');
    return room;
  }

  async join(roomId: string, user: User): Promise<Room> {
    const room = await this.findOne(roomId);
    const isMember = room.members.some((m) => m.id === user.id);
    if (!isMember) {
      room.members.push(user);
      await this.roomsRepository.save(room);
    }
    return room;
  }

  async leave(roomId: string, user: User): Promise<void> {
    const room = await this.findOne(roomId);
    room.members = room.members.filter((m) => m.id !== user.id);
    await this.roomsRepository.save(room);
  }

  async getUserRooms(userId: string): Promise<Room[]> {
    return this.roomsRepository
      .createQueryBuilder('room')
      .innerJoin('room.members', 'self', 'self.id = :userId', { userId })
      .leftJoinAndSelect('room.members', 'member')
      .leftJoinAndSelect('room.createdBy', 'creator')
      .orderBy('room.updatedAt', 'DESC')
      .getMany();
  }

  async createDirectRoom(user1: User, user2: User): Promise<Room> {
    // Single targeted query: find a DIRECT room that has BOTH users as members.
    // Avoids loading all direct rooms into memory (race condition + N+1 fix).
    const existing = await this.roomsRepository
      .createQueryBuilder('room')
      .innerJoin('room.members', 'm1', 'm1.id = :user1Id', { user1Id: user1.id })
      .innerJoin('room.members', 'm2', 'm2.id = :user2Id', { user2Id: user2.id })
      .leftJoinAndSelect('room.members', 'member')
      .leftJoinAndSelect('room.createdBy', 'creator')
      .where('room.type = :type', { type: RoomType.DIRECT })
      .getOne();

    if (existing) return existing;

    const room = this.roomsRepository.create({
      type: RoomType.DIRECT,
      members: [user1, user2],
      createdBy: user1,
    });
    return this.roomsRepository.save(room);
  }
}
