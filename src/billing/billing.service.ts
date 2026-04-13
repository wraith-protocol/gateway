import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import Stripe from 'stripe';
import { TeamEntity } from '../storage/entities/team.entity';
import { PlanEntity } from '../storage/entities/plan.entity';

@Injectable()
export class BillingService {
  private stripe: Stripe;

  constructor(
    private readonly config: ConfigService,
    @InjectRepository(TeamEntity)
    private readonly teamRepo: Repository<TeamEntity>,
    @InjectRepository(PlanEntity)
    private readonly planRepo: Repository<PlanEntity>,
  ) {
    this.stripe = new Stripe(this.config.get<string>('STRIPE_SECRET_KEY')!);
  }

  async listPlans() {
    return this.planRepo.find();
  }

  async getCurrentPlan(teamId: string) {
    const team = await this.teamRepo.findOneBy({ id: teamId });
    if (!team) throw new NotFoundException('Team not found');

    const plan = await this.planRepo.findOneBy({ id: team.plan });
    return {
      team: { id: team.id, name: team.name, plan: team.plan },
      plan,
      stripeCustomerId: team.stripeCustomerId,
      stripeSubscriptionId: team.stripeSubscriptionId,
    };
  }

  async createCheckoutSession(teamId: string, planId: string) {
    const team = await this.teamRepo.findOneBy({ id: teamId });
    if (!team) throw new NotFoundException('Team not found');

    const plan = await this.planRepo.findOneBy({ id: planId });
    if (!plan?.stripePriceId) throw new BadRequestException('Invalid plan');

    let customerId = team.stripeCustomerId;
    if (!customerId) {
      const customer = await this.stripe.customers.create({
        metadata: { teamId: team.id },
      });
      customerId = customer.id;
      await this.teamRepo.update(team.id, { stripeCustomerId: customerId });
    }

    const consoleUrl = this.config.get<string>('CONSOLE_URL');
    const session = await this.stripe.checkout.sessions.create({
      mode: 'subscription',
      customer: customerId,
      line_items: [{ price: plan.stripePriceId, quantity: 1 }],
      success_url: `${consoleUrl}/billing?success=true`,
      cancel_url: `${consoleUrl}/billing?canceled=true`,
      metadata: { teamId: team.id, planId },
    });

    return { url: session.url };
  }

  async createPortalSession(teamId: string) {
    const team = await this.teamRepo.findOneBy({ id: teamId });
    if (!team?.stripeCustomerId) {
      throw new BadRequestException('No billing account');
    }

    const consoleUrl = this.config.get<string>('CONSOLE_URL');
    const session = await this.stripe.billingPortal.sessions.create({
      customer: team.stripeCustomerId,
      return_url: `${consoleUrl}/billing`,
    });

    return { url: session.url };
  }

  async handleWebhook(payload: Buffer, signature: string) {
    const webhookSecret = this.config.get<string>('STRIPE_WEBHOOK_SECRET')!;
    const event = this.stripe.webhooks.constructEvent(payload, signature, webhookSecret);

    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        const teamId = session.metadata?.teamId;
        const planId = session.metadata?.planId;
        if (teamId && planId) {
          await this.teamRepo.update(teamId, {
            plan: planId,
            stripeCustomerId: session.customer as string,
            stripeSubscriptionId: session.subscription as string,
          });
        }
        break;
      }

      case 'invoice.paid': {
        // Confirm plan is active — no action needed for now
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice;
        const customerId =
          typeof invoice.customer === 'string' ? invoice.customer : invoice.customer?.id;
        if (customerId) {
          // In production: notify developer, mark as past_due
        }
        break;
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription;
        const team = await this.teamRepo.findOneBy({
          stripeSubscriptionId: subscription.id,
        });
        if (team) {
          // Update plan based on subscription price
          const priceId = subscription.items.data[0]?.price?.id;
          if (priceId) {
            const plan = await this.planRepo.findOneBy({ stripePriceId: priceId });
            if (plan) {
              await this.teamRepo.update(team.id, { plan: plan.id });
            }
          }
        }
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        const team = await this.teamRepo.findOneBy({
          stripeSubscriptionId: subscription.id,
        });
        if (team) {
          await this.teamRepo.update(team.id, {
            plan: 'free',
            stripeSubscriptionId: undefined,
          });
        }
        break;
      }
    }

    return { received: true };
  }
}
