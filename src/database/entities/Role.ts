import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  OneToMany,
  UpdateDateColumn,
  CreateDateColumn,
} from 'typeorm';
import { RolePermission } from './RolePermission';
import { Exclude } from 'class-transformer';

@Entity('roles')
export class Role {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  name: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date | null;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date | null;

  @OneToMany(() => RolePermission, (rp) => rp.role)
  rolePermissions: RolePermission[];
}
