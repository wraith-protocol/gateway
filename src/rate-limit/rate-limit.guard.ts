import {
  Injectable,
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { RateLimitService } from './rate-limit.service';

@Injectable()
export class RateLimitGuard implements CanActivate {
  constructor(private readonly rateLimitService: RateLimitService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const response = context.switchToHttp().getResponse();

    const apiKey = request.apiKey;
    const team = request.team;

    if (!apiKey || !team) return true;

    const result = await this.rateLimitService.check(apiKey.id, team.plan);

    response.header('X-RateLimit-Limit', String(result.limit));
    response.header('X-RateLimit-Remaining', String(result.remaining));
    response.header('X-RateLimit-Reset', String(result.resetAt));

    if (!result.allowed) {
      response.header('Retry-After', String(result.retryAfter));
      throw new HttpException(
        { error: 'Rate limit exceeded', retryAfter: result.retryAfter },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    return true;
  }
}
