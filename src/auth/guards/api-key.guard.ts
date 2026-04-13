import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { createHash } from 'crypto';
import { ApiKeyEntity } from '../../storage/entities/api-key.entity';
import { TeamEntity } from '../../storage/entities/team.entity';

@Injectable()
export class ApiKeyGuard implements CanActivate {
  constructor(
    @InjectRepository(ApiKeyEntity)
    private readonly apiKeyRepo: Repository<ApiKeyEntity>,
    @InjectRepository(TeamEntity)
    private readonly teamRepo: Repository<TeamEntity>,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const authHeader = request.headers['authorization'];

    if (!authHeader?.startsWith('Bearer ')) {
      throw new UnauthorizedException('Missing API key');
    }

    const key = authHeader.slice(7);
    const keyHash = createHash('sha256').update(key).digest('hex');

    const apiKey = await this.apiKeyRepo.findOne({
      where: { keyHash, revoked: false },
    });

    if (!apiKey) {
      throw new UnauthorizedException('Invalid API key');
    }

    if (apiKey.expiresAt && apiKey.expiresAt < new Date()) {
      throw new UnauthorizedException('API key expired');
    }

    const team = await this.teamRepo.findOneBy({ id: apiKey.teamId });
    if (!team) {
      throw new UnauthorizedException('Team not found');
    }

    request.apiKey = apiKey;
    request.team = team;

    this.apiKeyRepo.update(apiKey.id, { lastUsedAt: new Date() });

    return true;
  }
}
