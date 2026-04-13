import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TeamsController } from './teams.controller';
import { TeamsService } from './teams.service';
import { TeamEntity } from '../storage/entities/team.entity';
import { TeamMemberEntity } from '../storage/entities/team-member.entity';
import { DeveloperEntity } from '../storage/entities/developer.entity';

@Module({
  imports: [TypeOrmModule.forFeature([TeamEntity, TeamMemberEntity, DeveloperEntity])],
  controllers: [TeamsController],
  providers: [TeamsService],
  exports: [TeamsService],
})
export class TeamsModule {}
