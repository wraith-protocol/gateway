import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { randomBytes, createHmac } from 'crypto';
import { WebhookEndpointEntity } from '../storage/entities/webhook-endpoint.entity';

@Injectable()
export class WebhooksService {
  private readonly logger = new Logger(WebhooksService.name);

  constructor(
    @InjectRepository(WebhookEndpointEntity)
    private readonly webhookRepo: Repository<WebhookEndpointEntity>,
  ) {}

  async list(teamId: string) {
    return this.webhookRepo.find({ where: { teamId } });
  }

  async create(teamId: string, url: string, events: string[]) {
    const secret = 'whsec_' + randomBytes(24).toString('base64url');
    return this.webhookRepo.save(
      this.webhookRepo.create({
        teamId,
        url,
        secret,
        events,
        active: true,
      }),
    );
  }

  async update(
    teamId: string,
    webhookId: string,
    updates: Partial<{ url: string; events: string[]; active: boolean }>,
  ) {
    const webhook = await this.webhookRepo.findOne({
      where: { id: webhookId, teamId },
    });
    if (!webhook) throw new NotFoundException('Webhook not found');
    Object.assign(webhook, updates);
    return this.webhookRepo.save(webhook);
  }

  async delete(teamId: string, webhookId: string) {
    const webhook = await this.webhookRepo.findOne({
      where: { id: webhookId, teamId },
    });
    if (!webhook) throw new NotFoundException('Webhook not found');
    await this.webhookRepo.remove(webhook);
    return { deleted: true };
  }

  async test(teamId: string, webhookId: string) {
    const webhook = await this.webhookRepo.findOne({
      where: { id: webhookId, teamId },
    });
    if (!webhook) throw new NotFoundException('Webhook not found');

    const testPayload = {
      event: 'test',
      timestamp: new Date().toISOString(),
      data: { message: 'This is a test webhook event' },
    };

    const result = await this.deliver(webhook, testPayload);
    return { delivered: result.success, statusCode: result.statusCode };
  }

  async emit(teamId: string, event: string, data: unknown) {
    const webhooks = await this.webhookRepo.find({
      where: { teamId, active: true },
    });

    for (const webhook of webhooks) {
      if (webhook.events.includes(event) || webhook.events.includes('*')) {
        const payload = { event, timestamp: new Date().toISOString(), data };
        this.deliverWithRetry(webhook, payload);
      }
    }
  }

  private async deliverWithRetry(webhook: WebhookEndpointEntity, payload: unknown, maxRetries = 3) {
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      const result = await this.deliver(webhook, payload);
      if (result.success) return;

      if (attempt < maxRetries) {
        const delay = Math.pow(2, attempt) * 1000;
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
    this.logger.warn(`Webhook delivery failed after ${maxRetries} retries: ${webhook.url}`);
  }

  private async deliver(
    webhook: WebhookEndpointEntity,
    payload: unknown,
  ): Promise<{ success: boolean; statusCode?: number }> {
    const body = JSON.stringify(payload);
    const signature = createHmac('sha256', webhook.secret).update(body).digest('hex');

    try {
      const response = await fetch(webhook.url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Webhook-Signature': signature,
        },
        body,
        signal: AbortSignal.timeout(10000),
      });
      return { success: response.ok, statusCode: response.status };
    } catch {
      return { success: false };
    }
  }
}
