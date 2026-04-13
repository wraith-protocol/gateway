import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProxyController } from './proxy.controller';
import { ProxyService } from './proxy.service';
import { ApiKeyEntity } from '../storage/entities/api-key.entity';
import { TeamEntity } from '../storage/entities/team.entity';

@Module({
  imports: [TypeOrmModule.forFeature([ApiKeyEntity, TeamEntity])],
  controllers: [ProxyController],
  providers: [ProxyService],
})
export class ProxyModule {}
