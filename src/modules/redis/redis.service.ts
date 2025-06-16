import { Inject, Injectable, Logger } from '@nestjs/common';
import { Redis } from 'ioredis';

@Injectable()
export class RedisService {
  private readonly logger = new Logger(RedisService.name);

  constructor(@Inject('REDIS_CLIENT') private readonly redis: Redis) {}

  async get(key: string): Promise<string | null> {
    try {
      const value = await this.redis.get(key);
      return value;
    } catch (error) {
      this.logger.error(`Error getting key ${key}: ${error.message}`);
      throw error;
    }
  }

  async set(key: string, value: string, ttl?: number): Promise<void> {
    try {
      if (ttl) {
        await this.redis.set(key, value, 'EX', ttl);
        this.logger.log(`Set key ${key} with TTL ${ttl}s`);
      } else {
        await this.redis.set(key, value);
        this.logger.log(`Set key ${key} without TTL`);
      }
    } catch (error) {
      this.logger.error(`Error setting key ${key}: ${error.message}`);
      throw error;
    }
  }

  async setex(key: string, ttl: number, value: string): Promise<void> {
    try {
      await this.redis.setex(key, ttl, value);
      this.logger.log(`Set key ${key} with TTL ${ttl}s`);
    } catch (error) {
      this.logger.error(`Error setting key ${key} with TTL: ${error.message}`);
      throw error;
    }
  }

  async del(key: string): Promise<void> {
    try {
      await this.redis.del(key);
      this.logger.log(`Deleted key ${key}`);
    } catch (error) {
      this.logger.error(`Error deleting key ${key}: ${error.message}`);
      throw error;
    }
  }

  async keys(pattern: string = '*'): Promise<string[]> {
    try {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      const keys = await this.redis.keys(pattern);
      this.logger.log(`Found ${keys.length} keys matching pattern ${pattern}`);
      return keys;
    } catch (error) {
      this.logger.error(
        `Error getting keys with pattern ${pattern}: ${error.message}`,
      );
      throw error;
    }
  }

  async lpush(key: string, value: string | string[]): Promise<number> {
    try {
      const values = Array.isArray(value) ? value : [value];
      const result = await this.redis.lpush(key, ...values);
      this.logger.log(`Pushed ${values.length} items to list ${key}`);
      return result;
    } catch (error) {
      this.logger.error(`Error pushing to list ${key}: ${error.message}`);
      throw error;
    }
  }

  async rpop(key: string): Promise<string | null> {
    try {
      const value = await this.redis.rpop(key);
      if (value) {
        this.logger.log(`Popped value from list ${key}: ${value}`);
      }
      return value;
    } catch (error) {
      this.logger.error(`Error popping from list ${key}: ${error.message}`);
      throw error;
    }
  }

  async llen(key: string): Promise<number> {
    try {
      const length = await this.redis.llen(key);
      this.logger.log(`List ${key} length: ${length}`);
      return length;
    } catch (error) {
      this.logger.error(
        `Error getting length of list ${key}: ${error.message}`,
      );
      throw error;
    }
  }
}
