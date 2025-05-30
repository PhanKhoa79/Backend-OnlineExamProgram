import { Entity, ManyToOne, JoinColumn, PrimaryColumn } from 'typeorm';
import { Role } from './Role';
import { Permission } from './Permission';

@Entity('role_permissions')
export class RolePermission {
  @PrimaryColumn()
  roleId: number;

  @PrimaryColumn()
  permissionId: number;

  @ManyToOne(() => Role, (role) => role.rolePermissions)
  @JoinColumn({ name: 'roleId' })
  role: Role;

  @ManyToOne(() => Permission, (permission) => permission.rolePermissions)
  @JoinColumn({ name: 'permissionId' })
  permission: Permission;
}
