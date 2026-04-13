import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-github2';
import { ConfigService } from '@nestjs/config';
import { AuthService } from '../auth.service';

@Injectable()
export class GitHubStrategy extends PassportStrategy(Strategy, 'github') {
  constructor(
    config: ConfigService,
    private readonly authService: AuthService,
  ) {
    super({
      clientID: config.get<string>('GITHUB_CLIENT_ID')!,
      clientSecret: config.get<string>('GITHUB_CLIENT_SECRET')!,
      callbackURL: config.get<string>('GITHUB_CALLBACK_URL')!,
      scope: ['user:email'],
    });
  }

  async validate(
    _accessToken: string,
    _refreshToken: string,
    profile: {
      id: string;
      emails?: { value: string }[];
      displayName?: string;
      username?: string;
      photos?: { value: string }[];
    },
    done: (err: Error | null, user?: Record<string, unknown>) => void,
  ) {
    const developer = await this.authService.validateOAuth({
      provider: 'github',
      providerId: profile.id,
      email: profile.emails?.[0]?.value || '',
      name: profile.displayName || profile.username || '',
      avatarUrl: profile.photos?.[0]?.value,
    });
    done(null, developer as any);
  }
}
