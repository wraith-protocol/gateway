import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  SetMetadata,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TeamMemberEntity } from '../../storage/entities/team-member.entity';

export const TEAM_ROLES_KEY = 'teamRoles';
export const TeamRole = (...roles: string[]) => SetMetadata(TEAM_ROLES_KEY, roles);

@Injectable()
export class TeamRoleGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    @InjectRepository(TeamMemberEntity)
    private readonly memberRepo: Repository<TeamMemberEntity>,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredRoles = this.reflector.getAllAndOverride<string[]>(TEAM_ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredRoles) return true;

    const request = context.switchToHttp().getRequest();
    const developerId = request.user?.id;
    const teamId = request.params?.id || request.team?.id;

    if (!developerId || !teamId) {
      throw new ForbiddenException('Missing context');
    }

    const roleHierarchy: Record<string, number> = {
      owner: 3,
      admin: 2,
      member: 1,
    };

    const membership = await this.memberRepo.findOne({
      where: { teamId, developerId },
    });

    if (!membership) {
      throw new ForbiddenException('Not a team member');
    }

    const memberLevel = roleHierarchy[membership.role] || 0;
    const requiredLevel = Math.min(...requiredRoles.map((r) => roleHierarchy[r] || 0));

    if (memberLevel < requiredLevel) {
      throw new ForbiddenException('Insufficient role');
    }

    return true;
  }
}
