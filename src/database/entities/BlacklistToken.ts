import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
} from 'typeorm';

@Entity('blacklist_tokens')
export class BlacklistToken {
  @PrimaryGeneratedColumn()
  id: number;

  @Column('text')
  token: string;

  @Column()
  expiredAt: Date;

  @CreateDateColumn()
  createdAt: Date;
}
