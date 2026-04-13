import { Module, Global } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UsageController } from './usage.controller';
import { UsageService } from './usage.service';
import { UsageLogEntity } from '../storage/entities/usage-log.entity';

@Global()
@Module({
  imports: [TypeOrmModule.forFeature([UsageLogEntity])],
  controllers: [UsageController],
  providers: [UsageService],
  exports: [UsageService],
})
export class UsageModule {}
