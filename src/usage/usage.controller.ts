import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { UsageService } from './usage.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentDeveloper } from '../auth/decorators/current-developer.decorator';

@Controller('usage')
@UseGuards(JwtAuthGuard)
export class UsageController {
  constructor(private readonly usageService: UsageService) {}

  @Get('summary')
  summary(@CurrentDeveloper() dev: { teamId: string }) {
    return this.usageService.summary(dev.teamId);
  }

  @Get('daily')
  daily(
    @CurrentDeveloper() dev: { teamId: string },
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.usageService.daily(dev.teamId, from, to);
  }

  @Get('by-key')
  byKey(@CurrentDeveloper() dev: { teamId: string }) {
    return this.usageService.byKey(dev.teamId);
  }

  @Get('by-endpoint')
  byEndpoint(@CurrentDeveloper() dev: { teamId: string }) {
    return this.usageService.byEndpoint(dev.teamId);
  }
}
