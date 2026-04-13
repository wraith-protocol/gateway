import { Module, OnModuleInit } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DeveloperEntity } from './entities/developer.entity';
import { TeamEntity } from './entities/team.entity';
import { TeamMemberEntity } from './entities/team-member.entity';
import { ApiKeyEntity } from './entities/api-key.entity';
import { UsageLogEntity } from './entities/usage-log.entity';
import { PlanEntity } from './entities/plan.entity';
import { WebhookEndpointEntity } from './entities/webhook-endpoint.entity';
import { RefreshTokenEntity } from './entities/refresh-token.entity';

const entities = [
  DeveloperEntity,
  TeamEntity,
  TeamMemberEntity,
  ApiKeyEntity,
  UsageLogEntity,
  PlanEntity,
  WebhookEndpointEntity,
  RefreshTokenEntity,
];

@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'postgres',
        url: config.get<string>('DATABASE_URL'),
        entities,
        synchronize: config.get<string>('NODE_ENV') !== 'production',
      }),
    }),
    TypeOrmModule.forFeature(entities),
  ],
  exports: [TypeOrmModule],
})
export class StorageModule implements OnModuleInit {
  constructor(
    @InjectRepository(PlanEntity)
    private readonly planRepo: Repository<PlanEntity>,
  ) {}

  async onModuleInit() {
    await this.seedPlans();
  }

  private async seedPlans() {
    const defaultPlans: Partial<PlanEntity>[] = [
      {
        id: 'free',
        name: 'Free',
        monthlyRequestLimit: 1000,
        monthlyTokenLimit: 100000,
        maxAgents: 3,
        maxApiKeys: 2,
        priceMonthlyUsd: 0,
      },
      {
        id: 'pro',
        name: 'Pro',
        monthlyRequestLimit: 50000,
        monthlyTokenLimit: 5000000,
        maxAgents: 50,
        maxApiKeys: 10,
        priceMonthlyUsd: 4900,
        stripePriceId: 'price_pro_monthly',
      },
      {
        id: 'enterprise',
        name: 'Enterprise',
        monthlyRequestLimit: -1,
        monthlyTokenLimit: -1,
        maxAgents: -1,
        maxApiKeys: -1,
        priceMonthlyUsd: -1,
      },
    ];

    for (const plan of defaultPlans) {
      const exists = await this.planRepo.findOneBy({ id: plan.id });
      if (!exists) {
        await this.planRepo.save(this.planRepo.create(plan));
      }
    }
  }
}
