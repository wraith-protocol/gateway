import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { createHash, randomBytes } from 'crypto';
import { ApiKeyEntity } from '../storage/entities/api-key.entity';
import { TeamEntity } from '../storage/entities/team.entity';
import { PlanEntity } from '../storage/entities/plan.entity';

@Injectable()
export class KeysService {
  constructor(
    @InjectRepository(ApiKeyEntity)
    private readonly apiKeyRepo: Repository<ApiKeyEntity>,
    @InjectRepository(TeamEntity)
    private readonly teamRepo: Repository<TeamEntity>,
    @InjectRepository(PlanEntity)
    private readonly planRepo: Repository<PlanEntity>,
  ) {}

  async listForTeam(teamId: string) {
    const keys = await this.apiKeyRepo.find({
      where: { teamId },
      order: { createdAt: 'DESC' },
    });
    return keys.map((k) => ({
      id: k.id,
      name: k.name,
      keyPrefix: k.keyPrefix,
      environment: k.environment,
      lastUsedAt: k.lastUsedAt,
      expiresAt: k.expiresAt,
      revoked: k.revoked,
      createdAt: k.createdAt,
    }));
  }

  async create(teamId: string, name: string, environment: 'live' | 'test' = 'live') {
    const team = await this.teamRepo.findOneBy({ id: teamId });
    if (!team) throw new NotFoundException('Team not found');

    const plan = await this.planRepo.findOneBy({ id: team.plan });
    if (plan && plan.maxApiKeys !== -1) {
      const count = await this.apiKeyRepo.count({ where: { teamId, revoked: false } });
      if (count >= plan.maxApiKeys) {
        throw new ForbiddenException('API key limit reached for your plan');
      }
    }

    const prefix = environment === 'live' ? 'wraith_live_' : 'wraith_test_';
    const rawKey = prefix + randomBytes(32).toString('base64url');
    const keyHash = createHash('sha256').update(rawKey).digest('hex');
    const keyPrefix = rawKey.slice(0, 8);

    const apiKey = await this.apiKeyRepo.save(
      this.apiKeyRepo.create({
        teamId,
        name,
        keyPrefix,
        keyHash,
        environment,
        revoked: false,
      }),
    );

    return {
      id: apiKey.id,
      name: apiKey.name,
      environment: apiKey.environment,
      key: rawKey,
      keyPrefix: apiKey.keyPrefix,
      createdAt: apiKey.createdAt,
    };
  }

  async updateName(teamId: string, keyId: string, name: string) {
    const key = await this.apiKeyRepo.findOne({ where: { id: keyId, teamId } });
    if (!key) throw new NotFoundException('API key not found');
    key.name = name;
    return this.apiKeyRepo.save(key);
  }

  async revoke(teamId: string, keyId: string) {
    const key = await this.apiKeyRepo.findOne({ where: { id: keyId, teamId } });
    if (!key) throw new NotFoundException('API key not found');
    key.revoked = true;
    await this.apiKeyRepo.save(key);
    return { revoked: true };
  }
}
