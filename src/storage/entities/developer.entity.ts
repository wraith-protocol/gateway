import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';
import { TeamMemberEntity } from './team-member.entity';

@Entity('developers')
export class DeveloperEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  email: string;

  @Column()
  name: string;

  @Column({ nullable: true })
  passwordHash: string;

  @Column({ nullable: true })
  avatarUrl: string;

  @Column({ default: 'email' })
  authProvider: string;

  @Column({ nullable: true })
  authProviderId: string;

  @Column({ default: false })
  emailVerified: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @OneToMany(() => TeamMemberEntity, (member) => member.developer)
  memberships: TeamMemberEntity[];
}
