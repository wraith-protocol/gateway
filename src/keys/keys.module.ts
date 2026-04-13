import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { KeysController } from './keys.controller';
import { KeysService } from './keys.service';
import { ApiKeyEntity } from '../storage/entities/api-key.entity';
import { TeamEntity } from '../storage/entities/team.entity';
import { TeamMemberEntity } from '../storage/entities/team-member.entity';
import { PlanEntity } from '../storage/entities/plan.entity';

@Module({
  imports: [TypeOrmModule.forFeature([ApiKeyEntity, TeamEntity, TeamMemberEntity, PlanEntity])],
  controllers: [KeysController],
  providers: [KeysService],
  exports: [KeysService],
})
export class KeysModule {}
