import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { HealthModule } from './health/health.module';
import { StorageModule } from './storage/storage.module';
import { AuthModule } from './auth/auth.module';
import { TeamsModule } from './teams/teams.module';
import { KeysModule } from './keys/keys.module';
import { RateLimitModule } from './rate-limit/rate-limit.module';
import { UsageModule } from './usage/usage.module';
import configuration from './config/configuration';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
    }),
    StorageModule,
    AuthModule,
    TeamsModule,
    KeysModule,
    RateLimitModule,
    UsageModule,
    HealthModule,
  ],
})
export class AppModule {}
