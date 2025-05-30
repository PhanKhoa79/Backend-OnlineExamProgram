import { Entity, PrimaryGeneratedColumn, Column, OneToMany } from 'typeorm';
import { RolePermission } from './RolePermission';

@Entity('roles')
export class Role {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  name: string;

  @OneToMany(() => RolePermission, (rp) => rp.role)
  rolePermissions: RolePermission[];
}
