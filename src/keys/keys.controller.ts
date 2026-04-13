import { Controller, Get, Post, Patch, Delete, Param, Body, UseGuards } from '@nestjs/common';
import { KeysService } from './keys.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { TeamRoleGuard, TeamRole } from '../auth/guards/team-role.guard';

@Controller('teams/:id/keys')
@UseGuards(JwtAuthGuard, TeamRoleGuard)
export class KeysController {
  constructor(private readonly keysService: KeysService) {}

  @Get()
  @TeamRole('member')
  list(@Param('id') teamId: string) {
    return this.keysService.listForTeam(teamId);
  }

  @Post()
  @TeamRole('admin')
  create(
    @Param('id') teamId: string,
    @Body() body: { name: string; environment?: 'live' | 'test' },
  ) {
    return this.keysService.create(teamId, body.name, body.environment);
  }

  @Patch(':keyId')
  @TeamRole('admin')
  update(
    @Param('id') teamId: string,
    @Param('keyId') keyId: string,
    @Body() body: { name: string },
  ) {
    return this.keysService.updateName(teamId, keyId, body.name);
  }

  @Delete(':keyId')
  @TeamRole('admin')
  revoke(@Param('id') teamId: string, @Param('keyId') keyId: string) {
    return this.keysService.revoke(teamId, keyId);
  }
}
