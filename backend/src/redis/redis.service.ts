import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);
  private client: Redis;
  private subscriber: Redis;
  private publisher: Redis;

  constructor(private config: ConfigService) {}

  async onModuleInit() {
    const options = {
      host: this.config.get('REDIS_HOST', 'localhost'),
      port: this.config.get<number>('REDIS_PORT', 6379),
    };

    this.client = new Redis(options);
    this.subscriber = new Redis(options);
    this.publisher = new Redis(options);

    this.client.on('connect', () => this.logger.log('Redis client connected'));
    this.client.on('error', (err) => this.logger.error('Redis error:', err));
  }

  async onModuleDestroy() {
    await this.client.quit();
    await this.subscriber.quit();
    await this.publisher.quit();
  }

  async set(key: string, value: string, ttl?: number): Promise<void> {
    if (ttl) {
      await this.client.setex(key, ttl, value);
    } else {
      await this.client.set(key, value);
    }
  }

  async get(key: string): Promise<string | null> {
    return this.client.get(key);
  }

  async del(key: string): Promise<void> {
    await this.client.del(key);
  }

  async setUserOnline(userId: string, socketId: string): Promise<void> {
    await this.client.hset('online_users', userId, socketId);
    await this.client.set(`user:${userId}:online`, '1');
  }

  async setUserOffline(userId: string): Promise<void> {
    await this.client.hdel('online_users', userId);
    await this.client.del(`user:${userId}:online`);
  }

  async getOnlineUsers(): Promise<Record<string, string>> {
    return this.client.hgetall('online_users');
  }

  async isUserOnline(userId: string): Promise<boolean> {
    const result = await this.client.get(`user:${userId}:online`);
    return result === '1';
  }

  async publish(channel: string, message: string): Promise<void> {
    await this.publisher.publish(channel, message);
  }

  async subscribe(channel: string, callback: (message: string) => void): Promise<void> {
    await this.subscriber.subscribe(channel);
    this.subscriber.on('message', (ch, msg) => {
      if (ch === channel) callback(msg);
    });
  }

  getClient(): Redis {
    return this.client;
  }
}