import { Entity, PrimaryGeneratedColumn, Column, Index, ManyToOne, JoinColumn } from 'typeorm';
import { TeamEntity } from './team.entity';
import { ApiKeyEntity } from './api-key.entity';

@Entity('usage_logs')
@Index(['teamId', 'timestamp'])
@Index(['apiKeyId', 'timestamp'])
@Index(['timestamp'])
export class UsageLogEntity {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: string;

  @Column('uuid')
  teamId: string;

  @ManyToOne(() => TeamEntity)
  @JoinColumn({ name: 'teamId' })
  team: TeamEntity;

  @Column('uuid')
  apiKeyId: string;

  @ManyToOne(() => ApiKeyEntity)
  @JoinColumn({ name: 'apiKeyId' })
  apiKey: ApiKeyEntity;

  @Column()
  endpoint: string;

  @Column()
  method: string;

  @Column('int')
  statusCode: number;

  @Column('int')
  responseTimeMs: number;

  @Column({ type: 'int', nullable: true })
  tokensUsed: number;

  @Column({ type: 'timestamp', default: () => 'NOW()' })
  timestamp: Date;
}
