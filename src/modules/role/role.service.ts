import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Role } from '../../database/entities/Role';
import { ActionType, Permission } from 'src/database/entities/Permission';
import { RolePermission } from 'src/database/entities/RolePermission';
import { CreateRoleDto } from './dto/createRole.dto';
import { RoleWithPermissionsDto } from './dto/roleWithPermission.dto';

@Injectable()
export class RoleService {
  constructor(
    @InjectRepository(Role)
    private readonly roleRepository: Repository<Role>,

    @InjectRepository(Permission)
    private readonly permissionRepository: Repository<Permission>,

    @InjectRepository(RolePermission)
    private readonly rolePermissionRepository: Repository<RolePermission>,
  ) {}

  async getRoleNameById(roleId: number): Promise<string | null> {
    const role = await this.roleRepository.findOneBy({ id: roleId });
    return role ? role.name : null;
  }

  async findByName(name: string): Promise<Role | null> {
    return await this.roleRepository.findOne({
      where: { name },
    });
  }

  async getPermissionsByRoleId(
    roleId: number,
  ): Promise<RoleWithPermissionsDto | null> {
    const role = await this.roleRepository.findOne({
      where: { id: roleId },
      relations: ['rolePermissions', 'rolePermissions.permission'],
    });

    if (!role) {
      return null;
    }

    const permissions = role.rolePermissions.map(
      (rp) => `${rp.permission.resource}:${rp.permission.action}`,
    );

    const result: RoleWithPermissionsDto = {
      id: role.id,
      name: role.name,
      permissions: permissions,
      createdAt: role.createdAt ?? undefined,
      updatedAt: role.updatedAt ?? undefined,
    };

    return result;
  }

  async getAllRolesWithPermissions() {
    const roles = await this.roleRepository.find({
      relations: ['rolePermissions', 'rolePermissions.permission'],
      order: {
        updatedAt: 'DESC',
        createdAt: 'DESC',
      },
    });
    const result = roles.map((role) => ({
      id: role.id,
      name: role.name,
      permissions: role.rolePermissions.map(
        (rp) => `${rp.permission.resource}:${rp.permission.action}`,
      ),
      createdAt: role.createdAt ?? undefined,
      updatedAt: role.updatedAt ?? undefined,
    }));

    return result;
  }

  async getAllPermissions(): Promise<string[]> {
    const permissions = await this.permissionRepository.find();

    const permissionStrings = permissions.map(
      (permission) => `${permission.resource}:${permission.action}`,
    );

    return permissionStrings;
  }

  async createRoleWithPermissions(
    createRoleDto: CreateRoleDto,
  ): Promise<RoleWithPermissionsDto> {
    const { name, permissions } = createRoleDto;

    // Check nếu role đã tồn tại
    const existingRole = await this.roleRepository.findOne({
      where: { name },
    });
    if (existingRole) {
      throw new Error(`Role with name "${name}" already exists.`);
    }

    // Tạo role mới
    const newRole = this.roleRepository.create({ name });
    await this.roleRepository.save(newRole);

    // Tìm permissions
    const permissionEntities = await Promise.all(
      permissions.map(async (permStr) => {
        const [resource, action] = permStr.split(':');
        const permission = await this.permissionRepository.findOne({
          where: {
            resource,
            action: action as ActionType,
          },
        });
        if (!permission) {
          throw new Error(`Permission "${permStr}" not found.`);
        }
        return permission;
      }),
    );

    // Tạo role_permissions
    const rolePermissions = permissionEntities.map((permission) =>
      this.rolePermissionRepository.create({
        roleId: newRole.id,
        permissionId: permission.id,
      }),
    );

    await this.rolePermissionRepository.save(rolePermissions);

    // Format dữ liệu trả về đúng RoleWithPermissionsDto
    const result: RoleWithPermissionsDto = {
      id: newRole.id,
      name: newRole.name,
      permissions: permissionEntities.map(
        (perm) => `${perm.resource}:${perm.action}`,
      ),
      createdAt: newRole.createdAt ?? undefined,
      updatedAt: newRole.updatedAt ?? undefined,
    };

    return result;
  }

  async updateRolePermissions(
    roleId: number,
    permissions: string[],
  ): Promise<RoleWithPermissionsDto> {
    const role = await this.roleRepository.findOneBy({ id: roleId });
    if (!role) {
      throw new Error(`Role with id ${roleId} not found.`);
    }

    const permissionEntities = await Promise.all(
      permissions.map(async (permStr) => {
        const [resource, action] = permStr.split(':');
        const permission = await this.permissionRepository.findOne({
          where: {
            resource,
            action: action as ActionType,
          },
        });
        if (!permission) {
          throw new Error(`Permission "${permStr}" not found.`);
        }
        return permission;
      }),
    );

    await this.rolePermissionRepository.delete({ roleId });

    const rolePermissions = permissionEntities.map((permission) =>
      this.rolePermissionRepository.create({
        roleId: role.id,
        permissionId: permission.id,
      }),
    );
    await this.rolePermissionRepository.save(rolePermissions);

    role.updatedAt = new Date();
    await this.roleRepository.save(role);

    // Format dữ liệu trả về
    const result: RoleWithPermissionsDto = {
      id: role.id,
      name: role.name,
      permissions: permissionEntities.map(
        (perm) => `${perm.resource}:${perm.action}`,
      ),
      createdAt: role.createdAt ?? undefined,
      updatedAt: role.updatedAt ?? undefined,
    };

    return result;
  }

  async deleteRoleById(roleId: number): Promise<void> {
    const role = await this.roleRepository.findOne({
      where: { id: roleId },
    });

    if (!role) {
      throw new Error(`Role with id ${roleId} not found.`);
    }

    // Save role trước khi xóa để cập nhật updatedAt
    await this.roleRepository.save(role);

    await this.rolePermissionRepository.delete({ roleId });
    await this.roleRepository.delete(roleId);
  }
}
