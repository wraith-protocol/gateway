import { Entity, PrimaryColumn, Column } from 'typeorm';

@Entity('plans')
export class PlanEntity {
  @PrimaryColumn()
  id: string;

  @Column()
  name: string;

  @Column('int')
  monthlyRequestLimit: number;

  @Column('int')
  monthlyTokenLimit: number;

  @Column('int')
  maxAgents: number;

  @Column('int')
  maxApiKeys: number;

  @Column('int')
  priceMonthlyUsd: number;

  @Column({ nullable: true })
  stripePriceId: string;
}
