import { Entity, PrimaryGeneratedColumn, Column, OneToMany } from 'typeorm';
import { RolePermission } from './RolePermission';

export enum ActionType {
  CREATE = 'create',
  VIEW = 'view',
  UPDATE = 'update',
  DELETE = 'delete',
}

@Entity('permissions')
export class Permission {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({
    type: 'enum',
    enum: ActionType,
  })
  action: ActionType;

  @Column()
  resource: string;

  @OneToMany(() => RolePermission, (rp) => rp.permission)
  rolePermissions: RolePermission[];

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  created_at: Date;

  @Column({
    type: 'timestamp',
    default: () => 'CURRENT_TIMESTAMP',
    onUpdate: 'CURRENT_TIMESTAMP',
  })
  updated_at: Date;
}
