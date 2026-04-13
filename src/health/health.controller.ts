import { Controller, Get } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DataSource } from 'typeorm';

@Controller('health')
export class HealthController {
  constructor(
    private readonly dataSource: DataSource,
    private readonly config: ConfigService,
  ) {}

  @Get()
  async check() {
    const checks: Record<string, string> = {};

    try {
      await this.dataSource.query('SELECT 1');
      checks.database = 'ok';
    } catch {
      checks.database = 'error';
    }

    try {
      const Redis = (await import('ioredis')).default;
      const redis = new Redis(this.config.get<string>('REDIS_URL')!);
      await redis.ping();
      await redis.quit();
      checks.redis = 'ok';
    } catch {
      checks.redis = 'error';
    }

    try {
      const spectreUrl = this.config.get<string>('SPECTRE_INTERNAL_URL');
      const response = await fetch(`${spectreUrl}/health`, {
        signal: AbortSignal.timeout(5000),
      });
      checks.spectre = response.ok ? 'ok' : 'error';
    } catch {
      checks.spectre = 'unreachable';
    }

    const allOk = Object.values(checks).every((v) => v === 'ok' || v === 'unreachable');

    return {
      status: allOk ? 'ok' : 'degraded',
      timestamp: new Date().toISOString(),
      checks,
    };
  }
}
