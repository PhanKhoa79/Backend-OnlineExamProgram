import { Injectable, Logger } from '@nestjs/common';
import { RedisService } from '../redis/redis.service';
import { createHash } from 'crypto';
import {
  ExamVolumeResponseDto,
  ScoreStatisticsResponseDto,
  FailingStudentsResponseDto,
  TopStudentsResponseDto,
} from './dto/analytics-response.dto';

@Injectable()
export class AnalyticsCacheService {
  private readonly logger = new Logger(AnalyticsCacheService.name);

  // Cache TTL (Time To Live) configurations
  private readonly CACHE_TTL = {
    SUMMARY: 300,
    SCORE_TRENDS: 300,
    SUBJECT_PERFORMANCE: 300,
    SCORE_DISTRIBUTION: 300,
    EXAM_VOLUME: 300,
    SCORE_STATISTICS: 300,
    FAILING_STUDENTS: 300,
    TOP_STUDENTS: 300,
  };

  private readonly CACHE_PREFIX = {
    SUMMARY: 'analytics:summary',
    SCORE_TRENDS: 'analytics:trends',
    SUBJECT_PERFORMANCE: 'analytics:subjects',
    SCORE_DISTRIBUTION: 'analytics:distribution',

    EXAM_VOLUME: 'analytics:volume',
    SCORE_STATISTICS: 'analytics:score-stats',
    FAILING_STUDENTS: 'analytics:failing-students',
    TOP_STUDENTS: 'analytics:top-students',
  };

  constructor(private readonly redisService: RedisService) {}

  /**
   * Generate cache key based on query parameters
   */
  private generateCacheKey(prefix: string, queryParams: any): string {
    // Sort object keys to ensure consistent hashing
    const sortedParams = Object.keys(queryParams)
      .sort()
      .reduce((result, key) => {
        result[key] = queryParams[key];
        return result;
      }, {});

    // Create hash from parameters
    const paramsString = JSON.stringify(sortedParams);
    const hash = createHash('md5').update(paramsString).digest('hex');

    return `${prefix}:${hash}`;
  }

  /**
   * Get cached analytics data
   */
  async getCachedData<T>(prefix: string, queryParams: any): Promise<T | null> {
    try {
      const cacheKey = this.generateCacheKey(prefix, queryParams);
      const cachedData = await this.redisService.get(cacheKey);

      if (cachedData) {
        this.logger.log(`Cache HIT for key: ${cacheKey}`);
        return JSON.parse(cachedData) as T;
      }

      this.logger.log(`Cache MISS for key: ${cacheKey}`);
      return null;
    } catch (error) {
      this.logger.error(`Error getting cached data: ${error.message}`);
      return null; // Return null on error to continue with normal flow
    }
  }

  /**
   * Set analytics data to cache
   */
  async setCachedData<T>(
    prefix: string,
    queryParams: any,
    data: T,
    customTTL?: number,
  ): Promise<void> {
    try {
      const cacheKey = this.generateCacheKey(prefix, queryParams);
      const ttl = customTTL || this.getTTLByPrefix(prefix);

      await this.redisService.setex(cacheKey, ttl, JSON.stringify(data));
      this.logger.log(`Cached data for key: ${cacheKey} with TTL: ${ttl}s`);
    } catch (error) {
      this.logger.error(`Error setting cached data: ${error.message}`);
      // Don't throw error to avoid breaking the main flow
    }
  }

  /**
   * Get TTL based on cache prefix
   */
  private getTTLByPrefix(prefix: string): number {
    switch (prefix) {
      case this.CACHE_PREFIX.SUMMARY:
        return this.CACHE_TTL.SUMMARY;
      case this.CACHE_PREFIX.SCORE_TRENDS:
        return this.CACHE_TTL.SCORE_TRENDS;
      case this.CACHE_PREFIX.SUBJECT_PERFORMANCE:
        return this.CACHE_TTL.SUBJECT_PERFORMANCE;
      case this.CACHE_PREFIX.SCORE_DISTRIBUTION:
        return this.CACHE_TTL.SCORE_DISTRIBUTION;
      case this.CACHE_PREFIX.EXAM_VOLUME:
        return this.CACHE_TTL.EXAM_VOLUME;
      case this.CACHE_PREFIX.SCORE_STATISTICS:
        return this.CACHE_TTL.SCORE_STATISTICS;
      case this.CACHE_PREFIX.FAILING_STUDENTS:
        return this.CACHE_TTL.FAILING_STUDENTS;
      case this.CACHE_PREFIX.TOP_STUDENTS:
        return this.CACHE_TTL.TOP_STUDENTS;
      default:
        return 300; // Default 5 minutes
    }
  }

  /**
   * Analytics Summary Cache Methods
   */
  async getCachedSummary(queryParams: any): Promise<any | null> {
    return this.getCachedData(this.CACHE_PREFIX.SUMMARY, queryParams);
  }

  async setCachedSummary(queryParams: any, data: any): Promise<void> {
    return this.setCachedData(this.CACHE_PREFIX.SUMMARY, queryParams, data);
  }

  /**
   * Score Trends Cache Methods
   */
  async getCachedScoreTrends(queryParams: any): Promise<any | null> {
    return this.getCachedData(this.CACHE_PREFIX.SCORE_TRENDS, queryParams);
  }

  async setCachedScoreTrends(queryParams: any, data: any): Promise<void> {
    return this.setCachedData(
      this.CACHE_PREFIX.SCORE_TRENDS,
      queryParams,
      data,
    );
  }

  /**
   * Subject Performance Cache Methods
   */
  async getCachedSubjectPerformance(queryParams: any): Promise<any | null> {
    return this.getCachedData(
      this.CACHE_PREFIX.SUBJECT_PERFORMANCE,
      queryParams,
    );
  }

  async setCachedSubjectPerformance(
    queryParams: any,
    data: any,
  ): Promise<void> {
    return this.setCachedData(
      this.CACHE_PREFIX.SUBJECT_PERFORMANCE,
      queryParams,
      data,
    );
  }

  /**
   * Score Distribution Cache Methods
   */
  async getCachedScoreDistribution(queryParams: any): Promise<any | null> {
    return this.getCachedData(
      this.CACHE_PREFIX.SCORE_DISTRIBUTION,
      queryParams,
    );
  }

  async setCachedScoreDistribution(queryParams: any, data: any): Promise<void> {
    return this.setCachedData(
      this.CACHE_PREFIX.SCORE_DISTRIBUTION,
      queryParams,
      data,
    );
  }

  /**
   * Exam Volume Cache Methods
   */
  async getCachedExamVolume(
    queryParams: any,
  ): Promise<ExamVolumeResponseDto | null> {
    return this.getCachedData<ExamVolumeResponseDto>(
      this.CACHE_PREFIX.EXAM_VOLUME,
      queryParams,
    );
  }

  async setCachedExamVolume(
    queryParams: any,
    data: ExamVolumeResponseDto,
  ): Promise<void> {
    return this.setCachedData(this.CACHE_PREFIX.EXAM_VOLUME, queryParams, data);
  }

  /**
   * Score Statistics Cache Methods
   */
  async getCachedScoreStatistics(
    queryParams: any,
  ): Promise<ScoreStatisticsResponseDto | null> {
    return this.getCachedData<ScoreStatisticsResponseDto>(
      this.CACHE_PREFIX.SCORE_STATISTICS,
      queryParams,
    );
  }

  async setCachedScoreStatistics(
    queryParams: any,
    data: ScoreStatisticsResponseDto,
  ): Promise<void> {
    return this.setCachedData(
      this.CACHE_PREFIX.SCORE_STATISTICS,
      queryParams,
      data,
    );
  }

  /**
   * Failing Students Cache Methods
   */
  async getCachedFailingStudents(
    queryParams: any,
  ): Promise<FailingStudentsResponseDto | null> {
    return this.getCachedData<FailingStudentsResponseDto>(
      this.CACHE_PREFIX.FAILING_STUDENTS,
      queryParams,
    );
  }

  async setCachedFailingStudents(
    queryParams: any,
    data: FailingStudentsResponseDto,
  ): Promise<void> {
    return this.setCachedData(
      this.CACHE_PREFIX.FAILING_STUDENTS,
      queryParams,
      data,
    );
  }

  /**
   * Top Students Cache Methods
   */
  async getCachedTopStudents(
    queryParams: any,
  ): Promise<TopStudentsResponseDto | null> {
    return this.getCachedData<TopStudentsResponseDto>(
      this.CACHE_PREFIX.TOP_STUDENTS,
      queryParams,
    );
  }

  async setCachedTopStudents(
    queryParams: any,
    data: TopStudentsResponseDto,
  ): Promise<void> {
    return this.setCachedData(
      this.CACHE_PREFIX.TOP_STUDENTS,
      queryParams,
      data,
    );
  }

  /**
   * Invalidate cache patterns
   */
  async invalidateAnalyticsCache(pattern?: string): Promise<void> {
    try {
      const searchPattern = pattern || 'analytics:*';
      const keys = await this.redisService.keys(searchPattern);

      if (keys.length > 0) {
        for (const key of keys) {
          await this.redisService.del(key);
        }
        this.logger.log(
          `Invalidated ${keys.length} cache keys matching pattern: ${searchPattern}`,
        );
      }
    } catch (error) {
      this.logger.error(`Error invalidating cache: ${error.message}`);
    }
  }

  /**
   * Invalidate specific analytics caches
   */
  async invalidateSummaryCache(): Promise<void> {
    return this.invalidateAnalyticsCache(`${this.CACHE_PREFIX.SUMMARY}:*`);
  }

  async invalidateScoreTrendsCache(): Promise<void> {
    return this.invalidateAnalyticsCache(`${this.CACHE_PREFIX.SCORE_TRENDS}:*`);
  }

  async invalidateSubjectPerformanceCache(): Promise<void> {
    return this.invalidateAnalyticsCache(
      `${this.CACHE_PREFIX.SUBJECT_PERFORMANCE}:*`,
    );
  }

  async invalidateScoreDistributionCache(): Promise<void> {
    return this.invalidateAnalyticsCache(
      `${this.CACHE_PREFIX.SCORE_DISTRIBUTION}:*`,
    );
  }

  async invalidateExamVolumeCache(): Promise<void> {
    return this.invalidateAnalyticsCache(`${this.CACHE_PREFIX.EXAM_VOLUME}:*`);
  }

  async invalidateFailingStudentsCache(): Promise<void> {
    return this.invalidateAnalyticsCache(
      `${this.CACHE_PREFIX.FAILING_STUDENTS}:*`,
    );
  }

  async invalidateTopStudentsCache(): Promise<void> {
    return this.invalidateAnalyticsCache(`${this.CACHE_PREFIX.TOP_STUDENTS}:*`);
  }

  /**
   * Get cache statistics
   */
  async getCacheStats(): Promise<{
    totalKeys: number;
    keysByPrefix: Record<string, number>;
  }> {
    try {
      const allKeys = await this.redisService.keys('analytics:*');
      const keysByPrefix: Record<string, number> = {};

      // Count keys by prefix
      Object.values(this.CACHE_PREFIX).forEach((prefix) => {
        keysByPrefix[prefix] = allKeys.filter((key) =>
          key.startsWith(prefix),
        ).length;
      });

      return {
        totalKeys: allKeys.length,
        keysByPrefix,
      };
    } catch (error) {
      this.logger.error(`Error getting cache stats: ${error.message}`);
      return { totalKeys: 0, keysByPrefix: {} };
    }
  }

  /**
   * Warm up cache with common queries
   */
  async warmUpCache(): Promise<void> {
    this.logger.log('Starting cache warm-up...');
    // This method can be implemented to pre-populate cache with common queries
    // For now, it's just a placeholder
    this.logger.log('Cache warm-up completed');
  }
}
