import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
} from 'typeorm';
import { DeveloperEntity } from './developer.entity';
import { TeamMemberEntity } from './team-member.entity';
import { ApiKeyEntity } from './api-key.entity';
import { WebhookEndpointEntity } from './webhook-endpoint.entity';

@Entity('teams')
export class TeamEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column({ unique: true })
  slug: string;

  @Column()
  ownerId: string;

  @ManyToOne(() => DeveloperEntity)
  @JoinColumn({ name: 'ownerId' })
  owner: DeveloperEntity;

  @Column({ default: 'free' })
  plan: string;

  @Column({ nullable: true })
  stripeCustomerId: string;

  @Column({ nullable: true })
  stripeSubscriptionId: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @OneToMany(() => TeamMemberEntity, (member) => member.team)
  members: TeamMemberEntity[];

  @OneToMany(() => ApiKeyEntity, (key) => key.team)
  apiKeys: ApiKeyEntity[];

  @OneToMany(() => WebhookEndpointEntity, (webhook) => webhook.team)
  webhooks: WebhookEndpointEntity[];
}
