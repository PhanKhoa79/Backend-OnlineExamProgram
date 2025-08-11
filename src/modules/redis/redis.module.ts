import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import { RedisService } from './redis.service';

@Module({
  imports: [ConfigModule],
  providers: [
    {
      provide: 'REDIS_CLIENT',
      useFactory: (configService: ConfigService) => {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        const redisUrl = configService.get('REDIS_URL');

        let redis: Redis;
        if (redisUrl) {
          // Railway production - sử dụng REDIS_URL
          redis = new Redis(redisUrl, {
            family: 0,
            showFriendlyErrorStack: true,
            retryStrategy: (times) => Math.min(times * 50, 2000),
            maxRetriesPerRequest: 3,
          });
        } else {
          // Development fallback
          redis = new Redis({
            host: configService.get('REDIS_HOST', 'localhost'),
            port: configService.get('REDIS_PORT', 6379),
            password: configService.get('REDIS_PASSWORD'),
            showFriendlyErrorStack: true,
            retryStrategy: (times) => Math.min(times * 50, 2000),
          });
        }

        redis.on('connect', () => {
          console.log('✅ Connected to Redis');
        });
        redis.on('error', (err) => {
          console.error('❌ Redis connection error:', err);
        });

        return redis;
      },
      inject: [ConfigService],
    },
    RedisService,
  ],
  exports: [RedisService, 'REDIS_CLIENT'],
})
export class RedisModule {}
