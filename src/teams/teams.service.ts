import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { randomBytes } from 'crypto';
import { TeamEntity } from '../storage/entities/team.entity';
import { TeamMemberEntity } from '../storage/entities/team-member.entity';
import { DeveloperEntity } from '../storage/entities/developer.entity';

@Injectable()
export class TeamsService {
  constructor(
    @InjectRepository(TeamEntity)
    private readonly teamRepo: Repository<TeamEntity>,
    @InjectRepository(TeamMemberEntity)
    private readonly memberRepo: Repository<TeamMemberEntity>,
    @InjectRepository(DeveloperEntity)
    private readonly developerRepo: Repository<DeveloperEntity>,
  ) {}

  async listForDeveloper(developerId: string) {
    const memberships = await this.memberRepo.find({
      where: { developerId },
      relations: ['team'],
    });
    return memberships.map((m) => ({ ...m.team, role: m.role }));
  }

  async create(developerId: string, name: string, slug?: string) {
    const finalSlug = slug || name.replace(/[^a-z0-9-]/gi, '-').toLowerCase();
    const existing = await this.teamRepo.findOneBy({ slug: finalSlug });
    if (existing) {
      throw new ConflictException('Slug already taken');
    }

    const team = await this.teamRepo.save(
      this.teamRepo.create({
        name,
        slug: finalSlug + '-' + randomBytes(3).toString('hex'),
        ownerId: developerId,
        plan: 'free',
      }),
    );

    await this.memberRepo.save(
      this.memberRepo.create({
        teamId: team.id,
        developerId,
        role: 'owner',
      }),
    );

    return team;
  }

  async getById(teamId: string) {
    const team = await this.teamRepo.findOneBy({ id: teamId });
    if (!team) throw new NotFoundException('Team not found');
    return team;
  }

  async update(teamId: string, updates: { name?: string; slug?: string }) {
    const team = await this.getById(teamId);
    if (updates.slug) {
      const existing = await this.teamRepo.findOneBy({ slug: updates.slug });
      if (existing && existing.id !== teamId) {
        throw new ConflictException('Slug already taken');
      }
    }
    Object.assign(team, updates);
    return this.teamRepo.save(team);
  }

  async delete(teamId: string, developerId: string) {
    const team = await this.getById(teamId);
    if (team.ownerId !== developerId) {
      throw new ForbiddenException('Only the owner can delete a team');
    }
    await this.teamRepo.remove(team);
    return { deleted: true };
  }

  async listMembers(teamId: string) {
    return this.memberRepo.find({
      where: { teamId },
      relations: ['developer'],
    });
  }

  async addMember(teamId: string, email: string, role: string = 'member') {
    const developer = await this.developerRepo.findOneBy({ email });
    if (!developer) throw new NotFoundException('Developer not found');

    const existing = await this.memberRepo.findOne({
      where: { teamId, developerId: developer.id },
    });
    if (existing) throw new ConflictException('Already a member');

    return this.memberRepo.save(
      this.memberRepo.create({
        teamId,
        developerId: developer.id,
        role,
      }),
    );
  }

  async updateMemberRole(teamId: string, memberId: string, role: string) {
    const member = await this.memberRepo.findOne({
      where: { id: memberId, teamId },
    });
    if (!member) throw new NotFoundException('Member not found');
    if (member.role === 'owner') throw new ForbiddenException('Cannot change owner role');
    member.role = role;
    return this.memberRepo.save(member);
  }

  async removeMember(teamId: string, memberId: string) {
    const member = await this.memberRepo.findOne({
      where: { id: memberId, teamId },
    });
    if (!member) throw new NotFoundException('Member not found');
    if (member.role === 'owner') throw new ForbiddenException('Cannot remove the owner');
    await this.memberRepo.remove(member);
    return { removed: true };
  }
}
