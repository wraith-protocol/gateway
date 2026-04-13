import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { DeveloperEntity } from './developer.entity';
import { TeamEntity } from './team.entity';

@Entity('team_members')
export class TeamMemberEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  teamId: string;

  @ManyToOne(() => TeamEntity, (team) => team.members, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'teamId' })
  team: TeamEntity;

  @Column()
  developerId: string;

  @ManyToOne(() => DeveloperEntity, (dev) => dev.memberships, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'developerId' })
  developer: DeveloperEntity;

  @Column()
  role: string;

  @CreateDateColumn()
  createdAt: Date;
}
