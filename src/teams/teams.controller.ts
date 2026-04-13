import { Controller, Get, Post, Patch, Delete, Param, Body, UseGuards } from '@nestjs/common';
import { TeamsService } from './teams.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { TeamRoleGuard, TeamRole } from '../auth/guards/team-role.guard';
import { CurrentDeveloper } from '../auth/decorators/current-developer.decorator';

@Controller('teams')
@UseGuards(JwtAuthGuard)
export class TeamsController {
  constructor(private readonly teamsService: TeamsService) {}

  @Get()
  list(@CurrentDeveloper() dev: { id: string }) {
    return this.teamsService.listForDeveloper(dev.id);
  }

  @Post()
  create(@CurrentDeveloper() dev: { id: string }, @Body() body: { name: string; slug?: string }) {
    return this.teamsService.create(dev.id, body.name, body.slug);
  }

  @Get(':id')
  @UseGuards(TeamRoleGuard)
  @TeamRole('member')
  getById(@Param('id') id: string) {
    return this.teamsService.getById(id);
  }

  @Patch(':id')
  @UseGuards(TeamRoleGuard)
  @TeamRole('admin')
  update(@Param('id') id: string, @Body() body: { name?: string; slug?: string }) {
    return this.teamsService.update(id, body);
  }

  @Delete(':id')
  delete(@Param('id') id: string, @CurrentDeveloper() dev: { id: string }) {
    return this.teamsService.delete(id, dev.id);
  }

  @Get(':id/members')
  @UseGuards(TeamRoleGuard)
  @TeamRole('member')
  listMembers(@Param('id') id: string) {
    return this.teamsService.listMembers(id);
  }

  @Post(':id/members')
  @UseGuards(TeamRoleGuard)
  @TeamRole('admin')
  addMember(@Param('id') id: string, @Body() body: { email: string; role?: string }) {
    return this.teamsService.addMember(id, body.email, body.role);
  }

  @Patch(':id/members/:memberId')
  @UseGuards(TeamRoleGuard)
  @TeamRole('admin')
  updateMemberRole(
    @Param('id') id: string,
    @Param('memberId') memberId: string,
    @Body() body: { role: string },
  ) {
    return this.teamsService.updateMemberRole(id, memberId, body.role);
  }

  @Delete(':id/members/:memberId')
  @UseGuards(TeamRoleGuard)
  @TeamRole('admin')
  removeMember(@Param('id') id: string, @Param('memberId') memberId: string) {
    return this.teamsService.removeMember(id, memberId);
  }
}
