import { Controller, Get, Post, Body, UseGuards, Req, Headers, RawBody } from '@nestjs/common';
import { Request } from 'express';
import { BillingService } from './billing.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentDeveloper } from '../auth/decorators/current-developer.decorator';

@Controller('billing')
export class BillingController {
  constructor(private readonly billingService: BillingService) {}

  @Get('plans')
  @UseGuards(JwtAuthGuard)
  listPlans() {
    return this.billingService.listPlans();
  }

  @Get('current')
  @UseGuards(JwtAuthGuard)
  current(@CurrentDeveloper() dev: { teamId: string }) {
    return this.billingService.getCurrentPlan(dev.teamId);
  }

  @Post('checkout')
  @UseGuards(JwtAuthGuard)
  checkout(@CurrentDeveloper() dev: { teamId: string }, @Body() body: { planId: string }) {
    return this.billingService.createCheckoutSession(dev.teamId, body.planId);
  }

  @Post('portal')
  @UseGuards(JwtAuthGuard)
  portal(@CurrentDeveloper() dev: { teamId: string }) {
    return this.billingService.createPortalSession(dev.teamId);
  }

  @Post('webhooks')
  async webhooks(@Req() req: Request, @Headers('stripe-signature') signature: string) {
    const payload = (req as any).rawBody || Buffer.from(JSON.stringify(req.body));
    return this.billingService.handleWebhook(payload, signature);
  }
}
