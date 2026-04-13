import { Controller, All, Req, Res, UseGuards } from '@nestjs/common';
import { Request, Response } from 'express';
import { ProxyService } from './proxy.service';
import { ApiKeyGuard } from '../auth/guards/api-key.guard';
import { RateLimitGuard } from '../rate-limit/rate-limit.guard';
import { UsageService } from '../usage/usage.service';

@Controller('v1')
@UseGuards(ApiKeyGuard, RateLimitGuard)
export class ProxyController {
  constructor(
    private readonly proxyService: ProxyService,
    private readonly usageService: UsageService,
  ) {}

  @All('*')
  async proxy(@Req() req: Request, @Res() res: Response) {
    const startTime = Date.now();
    const path = req.url.replace('/v1', '') || '/';
    const apiKey = (req as any).apiKey;
    const team = (req as any).team;

    const result = await this.proxyService.forward({
      method: req.method,
      path,
      headers: req.headers as Record<string, string>,
      body: req.body,
      teamId: team.id,
      apiKeyId: apiKey.id,
    });

    const responseTimeMs = Date.now() - startTime;

    this.usageService.log({
      teamId: team.id,
      apiKeyId: apiKey.id,
      endpoint: path,
      method: req.method,
      statusCode: result.status,
      responseTimeMs,
      tokensUsed: result.tokensUsed || undefined,
    });

    for (const [key, value] of Object.entries(result.headers)) {
      res.header(key, value);
    }

    res.status(result.status).json(result.body);
  }
}
