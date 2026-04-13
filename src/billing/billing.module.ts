import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BillingController } from './billing.controller';
import { BillingService } from './billing.service';
import { TeamEntity } from '../storage/entities/team.entity';
import { PlanEntity } from '../storage/entities/plan.entity';

@Module({
  imports: [TypeOrmModule.forFeature([TeamEntity, PlanEntity])],
  controllers: [BillingController],
  providers: [BillingService],
  exports: [BillingService],
})
export class BillingModule {}
