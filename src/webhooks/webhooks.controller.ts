import { Controller, Get, Post, Patch, Delete, Param, Body, UseGuards } from '@nestjs/common';
import { WebhooksService } from './webhooks.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { TeamRoleGuard, TeamRole } from '../auth/guards/team-role.guard';

@Controller('teams/:id/webhooks')
@UseGuards(JwtAuthGuard, TeamRoleGuard)
export class WebhooksController {
  constructor(private readonly webhooksService: WebhooksService) {}

  @Get()
  @TeamRole('member')
  list(@Param('id') teamId: string) {
    return this.webhooksService.list(teamId);
  }

  @Post()
  @TeamRole('admin')
  create(@Param('id') teamId: string, @Body() body: { url: string; events: string[] }) {
    return this.webhooksService.create(teamId, body.url, body.events);
  }

  @Patch(':whId')
  @TeamRole('admin')
  update(
    @Param('id') teamId: string,
    @Param('whId') whId: string,
    @Body() body: { url?: string; events?: string[]; active?: boolean },
  ) {
    return this.webhooksService.update(teamId, whId, body);
  }

  @Delete(':whId')
  @TeamRole('admin')
  delete(@Param('id') teamId: string, @Param('whId') whId: string) {
    return this.webhooksService.delete(teamId, whId);
  }

  @Post(':whId/test')
  @TeamRole('admin')
  test(@Param('id') teamId: string, @Param('whId') whId: string) {
    return this.webhooksService.test(teamId, whId);
  }
}
