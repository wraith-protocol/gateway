import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

interface RateLimitResult {
  allowed: boolean;
  limit: number;
  remaining: number;
  resetAt: number;
  retryAfter?: number;
}

const PLAN_LIMITS: Record<string, { perMinute: number; perDay: number; perMonth: number }> = {
  free: { perMinute: 10, perDay: 100, perMonth: 1000 },
  pro: { perMinute: 100, perDay: 5000, perMonth: 50000 },
  enterprise: { perMinute: 1000, perDay: -1, perMonth: -1 },
};

@Injectable()
export class RateLimitService {
  private redis: Redis;

  constructor(private readonly config: ConfigService) {
    this.redis = new Redis(this.config.get<string>('REDIS_URL')!);
  }

  async check(apiKeyId: string, plan: string): Promise<RateLimitResult> {
    const limits = PLAN_LIMITS[plan] || PLAN_LIMITS.free;
    const now = Date.now();
    const minuteWindow = Math.floor(now / 60000);
    const minuteKey = `ratelimit:${apiKeyId}:min:${minuteWindow}`;

    const currentCount = await this.redis.incr(minuteKey);
    if (currentCount === 1) {
      await this.redis.expire(minuteKey, 120);
    }

    const resetAt = (minuteWindow + 1) * 60;

    if (limits.perMinute !== -1 && currentCount > limits.perMinute) {
      return {
        allowed: false,
        limit: limits.perMinute,
        remaining: 0,
        resetAt,
        retryAfter: Math.ceil(resetAt - now / 1000),
      };
    }

    return {
      allowed: true,
      limit: limits.perMinute,
      remaining: Math.max(0, limits.perMinute - currentCount),
      resetAt,
    };
  }
}
