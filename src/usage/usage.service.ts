import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { UsageLogEntity } from '../storage/entities/usage-log.entity';

interface LogEntry {
  teamId: string;
  apiKeyId: string;
  endpoint: string;
  method: string;
  statusCode: number;
  responseTimeMs: number;
  tokensUsed?: number;
}

@Injectable()
export class UsageService {
  constructor(
    @InjectRepository(UsageLogEntity)
    private readonly usageRepo: Repository<UsageLogEntity>,
  ) {}

  async log(entry: LogEntry) {
    await this.usageRepo.save(this.usageRepo.create(entry));
  }

  async summary(teamId: string) {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const result = await this.usageRepo
      .createQueryBuilder('log')
      .select('COUNT(*)', 'totalRequests')
      .addSelect('COALESCE(SUM(log.tokensUsed), 0)', 'totalTokens')
      .where('log.teamId = :teamId', { teamId })
      .andWhere('log.timestamp >= :start', { start: startOfMonth })
      .getRawOne();

    return {
      period: { start: startOfMonth.toISOString(), end: now.toISOString() },
      totalRequests: parseInt(result.totalRequests, 10),
      totalTokens: parseInt(result.totalTokens, 10),
    };
  }

  async daily(teamId: string, from?: string, to?: string) {
    const now = new Date();
    const start = from ? new Date(from) : new Date(now.getFullYear(), now.getMonth(), 1);
    const end = to ? new Date(to) : now;

    const results = await this.usageRepo
      .createQueryBuilder('log')
      .select("DATE_TRUNC('day', log.timestamp)", 'date')
      .addSelect('COUNT(*)', 'requests')
      .addSelect('COALESCE(SUM(log.tokensUsed), 0)', 'tokens')
      .where('log.teamId = :teamId', { teamId })
      .andWhere('log.timestamp BETWEEN :start AND :end', { start, end })
      .groupBy("DATE_TRUNC('day', log.timestamp)")
      .orderBy('date', 'ASC')
      .getRawMany();

    return results.map((r) => ({
      date: r.date,
      requests: parseInt(r.requests, 10),
      tokens: parseInt(r.tokens, 10),
    }));
  }

  async byKey(teamId: string) {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    return this.usageRepo
      .createQueryBuilder('log')
      .select('log.apiKeyId', 'apiKeyId')
      .addSelect('COUNT(*)', 'requests')
      .addSelect('COALESCE(SUM(log.tokensUsed), 0)', 'tokens')
      .where('log.teamId = :teamId', { teamId })
      .andWhere('log.timestamp >= :start', { start: startOfMonth })
      .groupBy('log.apiKeyId')
      .getRawMany();
  }

  async byEndpoint(teamId: string) {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    return this.usageRepo
      .createQueryBuilder('log')
      .select('log.endpoint', 'endpoint')
      .addSelect('COUNT(*)', 'requests')
      .addSelect('COALESCE(SUM(log.tokensUsed), 0)', 'tokens')
      .addSelect('ROUND(AVG(log.responseTimeMs))', 'avgResponseTimeMs')
      .where('log.teamId = :teamId', { teamId })
      .andWhere('log.timestamp >= :start', { start: startOfMonth })
      .groupBy('log.endpoint')
      .getRawMany();
  }
}
