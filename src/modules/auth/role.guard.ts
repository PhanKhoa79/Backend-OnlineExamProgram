import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<string[]>('roles', [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredRoles || requiredRoles.length === 0) {
      // Không yêu cầu role cụ thể -> cho qua
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user || !user.role || !user.role.name) {
      throw new ForbiddenException('Bạn không có quyền truy cập');
    }

    if (!requiredRoles.includes(user.role.name)) {
      throw new ForbiddenException('Bạn không có quyền truy cập');
    }

    return true;
  }
}
