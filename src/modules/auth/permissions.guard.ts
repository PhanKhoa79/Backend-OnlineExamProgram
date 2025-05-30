import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { DataSource } from 'typeorm';
import { RolePermission } from '../../database/entities/RolePermission';

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private dataSource: DataSource,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredPermissions = this.reflector.getAllAndOverride<string[]>(
      'permissions',
      [context.getHandler(), context.getClass()],
    );

    if (!requiredPermissions || requiredPermissions.length === 0) {
      // Không yêu cầu permission cụ thể -> cho qua
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user || !user.role || !user.role.id) {
      throw new ForbiddenException('Bạn không có quyền truy cập');
    }

    const userPermissions = await this.getPermissionsFromDB(user.role.id);

    const hasAllPermissions = requiredPermissions.every((p) =>
      userPermissions.includes(p),
    );

    if (!hasAllPermissions) {
      throw new ForbiddenException('Bạn không có quyền truy cập tính năng này');
    }

    return true;
  }

  private async getPermissionsFromDB(roleId: number): Promise<string[]> {
    const rolePermissions = await this.dataSource
      .getRepository(RolePermission)
      .createQueryBuilder('rp')
      .innerJoinAndSelect('rp.permission', 'permission')
      .where('rp.roleId = :roleId', { roleId })
      .getMany();

    return rolePermissions.map(
      (rp) => `${rp.permission.resource}:${rp.permission.action}`,
    );
  }
}
