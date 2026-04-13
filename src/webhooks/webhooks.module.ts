import { Module, Global } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { WebhooksController } from './webhooks.controller';
import { WebhooksService } from './webhooks.service';
import { WebhookEndpointEntity } from '../storage/entities/webhook-endpoint.entity';
import { TeamMemberEntity } from '../storage/entities/team-member.entity';

@Global()
@Module({
  imports: [TypeOrmModule.forFeature([WebhookEndpointEntity, TeamMemberEntity])],
  controllers: [WebhooksController],
  providers: [WebhooksService],
  exports: [WebhooksService],
})
export class WebhooksModule {}
