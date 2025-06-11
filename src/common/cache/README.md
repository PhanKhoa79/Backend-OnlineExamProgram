# Hệ thống Redis Cache

Hệ thống Redis cache được thiết kế để cải thiện hiệu suất ứng dụng bằng cách lưu trữ dữ liệu thường xuyên được truy cập vào Redis.

## Cấu hình

Redis cache đã được cấu hình sẵn trong `app.module.ts` với các thông số:

```typescript
CacheModule.register({
  isGlobal: true,
  store: redisStore,
  host: process.env.REDIS_HOST || '172.26.154.79',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  password: process.env.REDIS_PASSWORD,
  ttl: 900, // Default 15 minutes
  max: 10000, // Maximum number of items in cache
  retryAttempts: 3,
  retryDelay: 1000,
})
```

## Sử dụng RedisCacheService

### 1. Import service vào module/service của bạn

```typescript
import { RedisCacheService } from 'src/common/cache/redis-cache.service';

@Injectable()
export class YourService {
  constructor(
    private readonly cacheService: RedisCacheService,
  ) {}
}
```

### 2. Các phương thức cơ bản

#### Get dữ liệu từ cache
```typescript
const data = await this.cacheService.get<YourDataType>('cache-key');
```

#### Set dữ liệu vào cache
```typescript
await this.cacheService.set('cache-key', data, 3600); // TTL 1 hour
```

#### Get hoặc Set (cache-aside pattern)
```typescript
const data = await this.cacheService.getOrSet(
  'cache-key',
  async () => {
    // Function để fetch data từ database
    return await this.repository.find();
  },
  { ttl: RedisCacheService.TTL.MEDIUM }
);
```

#### Xóa cache
```typescript
// Xóa một key cụ thể
await this.cacheService.del('cache-key');

// Xóa theo pattern
await this.cacheService.delByPattern('student:*');

// Xóa toàn bộ cache
await this.cacheService.reset();
```

### 3. Tạo cache key

```typescript
// Tạo key có cấu trúc
const key = this.cacheService.generateKey(
  RedisCacheService.KEYS.STUDENT, 
  'id', 
  123
);
// Result: "student:id:123"
```

### 4. TTL Constants

```typescript
RedisCacheService.TTL.VERY_SHORT // 1 minute
RedisCacheService.TTL.SHORT      // 5 minutes  
RedisCacheService.TTL.MEDIUM     // 15 minutes
RedisCacheService.TTL.LONG       // 1 hour
RedisCacheService.TTL.VERY_LONG  // 24 hours
RedisCacheService.TTL.WEEK       // 7 days
```

### 5. Cache Key Prefixes

```typescript
RedisCacheService.KEYS.STUDENT
RedisCacheService.KEYS.SUBJECT
RedisCacheService.KEYS.CLASS
RedisCacheService.KEYS.EXAM
RedisCacheService.KEYS.QUESTION
RedisCacheService.KEYS.AUTH
RedisCacheService.KEYS.ACCOUNT
RedisCacheService.KEYS.ROLE
RedisCacheService.KEYS.EXAM_SCHEDULE
```

## Ví dụ thực tế

### Cache trong Service

```typescript
@Injectable()
export class StudentService {
  constructor(
    private readonly studentRepository: StudentRepository,
    private readonly cacheService: RedisCacheService,
  ) {}

  async findById(id: number): Promise<Students> {
    const cacheKey = this.cacheService.generateKey(
      RedisCacheService.KEYS.STUDENT,
      'id',
      id,
    );

    return this.cacheService.getOrSet(
      cacheKey,
      async () => {
        const student = await this.studentRepository.findOne({
          where: { id },
          relations: ['class'],
        });
        if (!student) throw new NotFoundException('Không tìm thấy sinh viên');
        return student;
      },
      { ttl: RedisCacheService.TTL.MEDIUM },
    );
  }

  async create(dto: CreateStudentDto): Promise<Students> {
    const student = await this.studentRepository.save(dto);
    
    // Invalidate cache sau khi tạo mới
    await this.cacheService.delByPattern(`${RedisCacheService.KEYS.STUDENT}:*`);
    
    return student;
  }

  async update(id: number, dto: UpdateStudentDto): Promise<Students> {
    const student = await this.studentRepository.save({ id, ...dto });
    
    // Invalidate specific cache
    await this.cacheService.del(
      this.cacheService.generateKey(RedisCacheService.KEYS.STUDENT, 'id', id)
    );
    await this.cacheService.delByPattern(`${RedisCacheService.KEYS.STUDENT}:list*`);
    
    return student;
  }
}
```

## Best Practices

### 1. Cache Strategy

- **Read-heavy data**: Sử dụng cache cho dữ liệu được đọc nhiều như danh sách subjects, classes
- **User-specific data**: Cache với key chứa user ID
- **Expensive operations**: Cache kết quả của các operation phức tạp

### 2. Cache Invalidation

- **Create**: Invalidate list cache
- **Update**: Invalidate specific item và list cache
- **Delete**: Invalidate specific item và list cache

### 3. TTL Selection

- **Static data** (subjects, roles): LONG hoặc VERY_LONG
- **Semi-dynamic data** (student lists): MEDIUM
- **Dynamic data** (exam results): SHORT hoặc VERY_SHORT
- **User sessions**: Theo session timeout

### 4. Error Handling

Service đã được thiết kế để graceful fallback - nếu Redis fail, vẫn trả về data từ database.

### 5. Monitoring

Sử dụng logs để monitor cache hit/miss:

```
[CacheService] Cache hit for key: student:id:123
[CacheService] Cache miss for key: student:id:456
[CacheService] Cache set for key: student:list, TTL: 300
```

## Environment Variables

Cấu hình Redis trong `.env`:

```
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=your_password
``` 