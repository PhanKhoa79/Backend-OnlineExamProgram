import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Inject, Injectable, Logger } from '@nestjs/common';
import { Cache } from 'cache-manager';

export interface CacheOptions {
  ttl?: number; // Time to live in seconds
  key?: string; // Custom cache key
}

@Injectable()
export class RedisCacheService {
  private readonly logger = new Logger(RedisCacheService.name);

  constructor(@Inject(CACHE_MANAGER) private cacheManager: Cache) {}

  /**
   * Get cached data by key
   */
  async get<T>(key: string): Promise<T | undefined> {
    try {
      const value = await this.cacheManager.get<T>(key);
      if (value) {
        this.logger.debug(`Cache hit for key: ${key}`);
      } else {
        this.logger.debug(`Cache miss for key: ${key}`);
      }
      return value;
    } catch (error) {
      this.logger.error(`Error getting cache for key ${key}:`, error);
      return undefined;
    }
  }

  /**
   * Set cache data with optional TTL
   */
  async set(key: string, value: any, ttl?: number): Promise<void> {
    try {
      await this.cacheManager.set(key, value, ttl);
      this.logger.debug(`Cache set for key: ${key}, TTL: ${ttl || 'default'}`);
    } catch (error) {
      this.logger.error(`Error setting cache for key ${key}:`, error);
    }
  }

  /**
   * Delete specific cache key
   */
  async del(key: string): Promise<void> {
    try {
      await this.cacheManager.del(key);
      this.logger.debug(`Cache deleted for key: ${key}`);
    } catch (error) {
      this.logger.error(`Error deleting cache for key ${key}:`, error);
    }
  }

  /**
   * Delete multiple cache keys by pattern
   */
  async delByPattern(pattern: string): Promise<void> {
    try {
      // Get Redis client to use pattern deletion
      const redisClient = (this.cacheManager as any).store.client;
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      const keys = await redisClient.keys(pattern);

      if (keys.length > 0) {
        await redisClient.del(...keys);
        this.logger.debug(
          `Cache deleted for pattern: ${pattern}, keys: ${keys.length}`,
        );
      }
    } catch (error) {
      this.logger.error(`Error deleting cache by pattern ${pattern}:`, error);
    }
  }

  /**
   * Clear all cache
   */
  async reset(): Promise<void> {
    try {
      await this.cacheManager.reset();
      this.logger.debug('All cache cleared');
    } catch (error) {
      this.logger.error('Error clearing all cache:', error);
    }
  }

  /**
   * Get or set cache data (cache-aside pattern)
   */
  async getOrSet<T>(
    key: string,
    factory: () => Promise<T>,
    options: CacheOptions = {},
  ): Promise<T> {
    try {
      // Try to get from cache first
      const cached = await this.get<T>(key);
      if (cached !== undefined) {
        return cached;
      }

      // If not in cache, call factory function
      const value = await factory();

      // Set in cache for future use
      await this.set(key, value, options.ttl);

      return value;
    } catch (error) {
      this.logger.error(`Error in getOrSet for key ${key}:`, error);
      // If cache fails, still try to return the actual data
      return await factory();
    }
  }

  /**
   * Generate cache key with prefix
   */
  generateKey(prefix: string, ...parts: (string | number)[]): string {
    return `${prefix}:${parts.join(':')}`;
  }

  /**
   * Cache TTL constants
   */
  static readonly TTL = {
    VERY_SHORT: 60, // 1 minute
    SHORT: 300, // 5 minutes
    MEDIUM: 900, // 15 minutes
    LONG: 3600, // 1 hour
    VERY_LONG: 86400, // 24 hours
    WEEK: 604800, // 7 days
  } as const;

  /**
   * Cache key prefixes for different modules
   */
  static readonly KEYS = {
    STUDENT: 'student',
    SUBJECT: 'subject',
    CLASS: 'class',
    EXAM: 'exam',
    QUESTION: 'question',
    AUTH: 'auth',
    ACCOUNT: 'account',
    ROLE: 'role',
    EXAM_SCHEDULE: 'exam_schedule',
  } as const;
}
