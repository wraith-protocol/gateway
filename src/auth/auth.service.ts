import {
  Injectable,
  BadRequestException,
  UnauthorizedException,
  ConflictException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { createHash, randomBytes } from 'crypto';
import { DeveloperEntity } from '../storage/entities/developer.entity';
import { TeamEntity } from '../storage/entities/team.entity';
import { TeamMemberEntity } from '../storage/entities/team-member.entity';
import { RefreshTokenEntity } from '../storage/entities/refresh-token.entity';

interface OAuthProfile {
  provider: string;
  providerId: string;
  email: string;
  name: string;
  avatarUrl?: string;
}

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(DeveloperEntity)
    private readonly developerRepo: Repository<DeveloperEntity>,
    @InjectRepository(TeamEntity)
    private readonly teamRepo: Repository<TeamEntity>,
    @InjectRepository(TeamMemberEntity)
    private readonly memberRepo: Repository<TeamMemberEntity>,
    @InjectRepository(RefreshTokenEntity)
    private readonly refreshTokenRepo: Repository<RefreshTokenEntity>,
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
  ) {}

  async register(email: string, password: string, name: string) {
    const existing = await this.developerRepo.findOneBy({ email });
    if (existing) {
      throw new ConflictException('Email already registered');
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const developer = await this.developerRepo.save(
      this.developerRepo.create({
        email,
        name,
        passwordHash,
        authProvider: 'email',
        emailVerified: false,
      }),
    );

    await this.createDefaultTeam(developer);
    return this.issueTokens(developer);
  }

  async validateLocal(email: string, password: string): Promise<DeveloperEntity | null> {
    const developer = await this.developerRepo.findOneBy({ email });
    if (!developer?.passwordHash) return null;

    const valid = await bcrypt.compare(password, developer.passwordHash);
    return valid ? developer : null;
  }

  async login(developer: DeveloperEntity) {
    return this.issueTokens(developer);
  }

  async validateOAuth(profile: OAuthProfile) {
    let developer = await this.developerRepo.findOneBy({
      authProvider: profile.provider,
      authProviderId: profile.providerId,
    });

    if (!developer) {
      developer = await this.developerRepo.findOneBy({ email: profile.email });
      if (developer) {
        developer.authProvider = profile.provider;
        developer.authProviderId = profile.providerId;
        if (profile.avatarUrl) developer.avatarUrl = profile.avatarUrl;
        await this.developerRepo.save(developer);
      }
    }

    if (!developer) {
      developer = await this.developerRepo.save(
        this.developerRepo.create({
          email: profile.email,
          name: profile.name,
          authProvider: profile.provider,
          authProviderId: profile.providerId,
          avatarUrl: profile.avatarUrl,
          emailVerified: true,
        }),
      );
      await this.createDefaultTeam(developer);
    }

    return developer;
  }

  async refresh(refreshToken: string) {
    const tokenHash = createHash('sha256').update(refreshToken).digest('hex');
    const stored = await this.refreshTokenRepo.findOne({
      where: { tokenHash, revoked: false },
      relations: ['developer'],
    });

    if (!stored || stored.expiresAt < new Date()) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    await this.refreshTokenRepo.update(stored.id, { revoked: true });
    return this.issueTokens(stored.developer);
  }

  async logout(refreshToken: string) {
    const tokenHash = createHash('sha256').update(refreshToken).digest('hex');
    await this.refreshTokenRepo.update({ tokenHash }, { revoked: true });
  }

  async getProfile(developerId: string) {
    const developer = await this.developerRepo.findOneBy({ id: developerId });
    if (!developer) throw new UnauthorizedException('Developer not found');
    return this.sanitizeDeveloper(developer);
  }

  async updateProfile(developerId: string, updates: { name?: string; avatarUrl?: string }) {
    await this.developerRepo.update(developerId, updates);
    return this.getProfile(developerId);
  }

  async forgotPassword(email: string) {
    const developer = await this.developerRepo.findOneBy({ email });
    if (!developer) return { message: 'If the email exists, a reset link has been sent' };

    // In production, send email with reset token
    // For now, just return success
    return { message: 'If the email exists, a reset link has been sent' };
  }

  async resetPassword(token: string, newPassword: string) {
    // In production, validate token and reset password
    if (!token) throw new BadRequestException('Invalid reset token');
    if (!newPassword || newPassword.length < 8) {
      throw new BadRequestException('Password must be at least 8 characters');
    }
    return { message: 'Password reset successful' };
  }

  private async issueTokens(developer: DeveloperEntity) {
    const membership = await this.memberRepo.findOne({
      where: { developerId: developer.id },
    });

    const payload = {
      sub: developer.id,
      email: developer.email,
      teamId: membership?.teamId,
    };

    const accessToken = this.jwtService.sign(payload, {
      secret: this.config.get<string>('JWT_SECRET'),
      expiresIn: '1h',
    });

    const rawRefreshToken = randomBytes(32).toString('base64url');
    const tokenHash = createHash('sha256').update(rawRefreshToken).digest('hex');

    await this.refreshTokenRepo.save(
      this.refreshTokenRepo.create({
        developerId: developer.id,
        tokenHash,
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      }),
    );

    return {
      accessToken,
      refreshToken: rawRefreshToken,
      developer: this.sanitizeDeveloper(developer),
    };
  }

  private async createDefaultTeam(developer: DeveloperEntity) {
    const slug = developer.email
      .split('@')[0]
      .replace(/[^a-z0-9-]/gi, '-')
      .toLowerCase();
    const team = await this.teamRepo.save(
      this.teamRepo.create({
        name: `${developer.name}'s Team`,
        slug: `${slug}-${randomBytes(3).toString('hex')}`,
        ownerId: developer.id,
        plan: 'free',
      }),
    );

    await this.memberRepo.save(
      this.memberRepo.create({
        teamId: team.id,
        developerId: developer.id,
        role: 'owner',
      }),
    );

    return team;
  }

  private sanitizeDeveloper(developer: DeveloperEntity) {
    return {
      id: developer.id,
      email: developer.email,
      name: developer.name,
      avatarUrl: developer.avatarUrl,
      authProvider: developer.authProvider,
      emailVerified: developer.emailVerified,
      createdAt: developer.createdAt,
    };
  }
}
