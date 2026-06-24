import {
  Entity, PrimaryGeneratedColumn, Column,
  CreateDateColumn, UpdateDateColumn,
  ManyToOne, OneToMany, ManyToMany, JoinTable, JoinColumn
} from 'typeorm';
import { User } from '../../users/entities/user.entity';

export enum RoomType {
  PUBLIC = 'public',
  PRIVATE = 'private',
  DIRECT = 'direct',
}

@Entity('rooms')
export class Room {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ nullable: true })
  name: string;

  @Column({ nullable: true })
  description: string;

  @Column({ type: 'enum', enum: RoomType, default: RoomType.PUBLIC })
  type: RoomType;

  @ManyToOne(() => User, { eager: true, nullable: true })
  @JoinColumn()
  createdBy: User;

  @ManyToMany(() => User, { eager: true, cascade: true })
  @JoinTable()
  members: User[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}