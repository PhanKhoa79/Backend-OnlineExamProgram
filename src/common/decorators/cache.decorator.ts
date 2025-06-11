import { SetMetadata } from '@nestjs/common';

export const CACHE_KEY_METADATA = 'cache_key';
export const CACHE_TTL_METADATA = 'cache_ttl';

export interface CacheDecoratorOptions {
  key?: string; // Custom cache key template, can use parameters like {id}, {email}
  ttl?: number; // Time to live in seconds
  keyPrefix?: string; // Prefix for the cache key
}

/**
 * Cache decorator to automatically cache method results
 *
 * @param options Cache configuration options
 *
 * Example usage:
 * @Cache({ key: 'student:{id}', ttl: 3600, keyPrefix: 'api' })
 * async findById(id: number) { ... }
 *
 * This will cache with key: 'api:student:123' for TTL 3600 seconds
 */
export const Cache = (options: CacheDecoratorOptions = {}) => {
  return (target: any, propertyKey: string, descriptor: PropertyDescriptor) => {
    SetMetadata(CACHE_KEY_METADATA, options.key || propertyKey)(
      target,
      propertyKey,
      descriptor,
    );
    SetMetadata(CACHE_TTL_METADATA, options.ttl || 900)(
      target,
      propertyKey,
      descriptor,
    );

    // Store the options for the interceptor to use
    Reflect.defineMetadata('cache_options', options, target, propertyKey);

    return descriptor;
  };
};

/**
 * Cache invalidation decorator to automatically invalidate cache when method is called
 *
 * @param patterns Array of cache key patterns to invalidate
 *
 * Example usage:
 * @CacheEvict(['student:*', 'students:list'])
 * async updateStudent(id: number, data: UpdateStudentDto) { ... }
 */
export const CacheEvict = (patterns: string[]) => {
  return (target: any, propertyKey: string, descriptor: PropertyDescriptor) => {
    Reflect.defineMetadata(
      'cache_evict_patterns',
      patterns,
      target,
      propertyKey,
    );
    return descriptor;
  };
};
