import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable, of } from 'rxjs';
import { tap } from 'rxjs/operators';
import { Reflector } from '@nestjs/core';
import { RedisCacheService } from '../cache/redis-cache.service';

@Injectable()
export class CacheInterceptor implements NestInterceptor {
  private readonly logger = new Logger(CacheInterceptor.name);

  constructor(
    private readonly cacheService: RedisCacheService,
    private readonly reflector: Reflector,
  ) {}

  async intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Promise<Observable<any>> {
    const request = context.switchToHttp().getRequest();
    const handler = context.getHandler();
    const className = context.getClass().name;
    const methodName = handler.name;

    // Get cache options from metadata
    const cacheOptions = this.reflector.get('cache_options', handler);
    const evictPatterns = this.reflector.get('cache_evict_patterns', handler);

    // Handle cache eviction first
    if (evictPatterns && evictPatterns.length > 0) {
      for (const pattern of evictPatterns) {
        await this.cacheService.delByPattern(pattern);
      }
      this.logger.debug(
        `Cache evicted for patterns: ${evictPatterns.join(', ')}`,
      );
    }

    // Only cache GET requests by default
    const isGetRequest = request.method === 'GET';
    const shouldCache = cacheOptions && isGetRequest;

    if (!shouldCache) {
      return next.handle();
    }

    // Generate cache key
    const cacheKey = this.generateCacheKey(
      cacheOptions,
      className,
      methodName,
      request,
    );

    // Try to get from cache
    const cachedResult = await this.cacheService.get(cacheKey);
    if (cachedResult !== undefined) {
      this.logger.debug(`Cache hit for key: ${cacheKey}`);
      return of(cachedResult);
    }

    return next.handle().pipe(
      // eslint-disable-next-line @typescript-eslint/no-misused-promises
      tap(async (result) => {
        if (result !== undefined && result !== null) {
          await this.cacheService.set(cacheKey, result, cacheOptions.ttl);
          this.logger.debug(`Cache set for key: ${cacheKey}`);
        }
      }),
    );
  }

  private generateCacheKey(
    cacheOptions: any,
    className: string,
    methodName: string,
    request: any,
  ): string {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    let key = cacheOptions.key || `${className}:${methodName}`;

    if (key.includes('{')) {
      if (request.params) {
        Object.keys(request.params).forEach((param) => {
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
          key = key.replace(`{${param}}`, request.params[param]);
        });
      }

      if (request.query) {
        Object.keys(request.query).forEach((param) => {
          key = key.replace(`{${param}}`, request.query[param]);
        });
      }

      if (request.body) {
        Object.keys(request.body).forEach((param) => {
          key = key.replace(`{${param}}`, request.body[param]);
        });
      }
    }

    if (cacheOptions.keyPrefix) {
      key = `${cacheOptions.keyPrefix}:${key}`;
    }

    if (!cacheOptions.key && Object.keys(request.query || {}).length > 0) {
      const queryString = new URLSearchParams(request.query).toString();
      key += `:${Buffer.from(queryString).toString('base64')}`;
    }

    return key;
  }
}
