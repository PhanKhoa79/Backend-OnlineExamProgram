import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { RedisService } from './redis.service';

@Module({
  imports: [ConfigModule],
  providers: [
    {
      provide: 'REDIS_CLIENT',
      useFactory: async (configService: ConfigService) => {
        const Redis = require('ioredis');
        const redis = new Redis({
          host: configService.get('REDIS_HOST', 'localhost'),
          port: configService.get('REDIS_PORT', 6379),
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
