import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Role } from '../../database/entities/Role';
import { ActionType, Permission } from 'src/database/entities/Permission';
import { RolePermission } from 'src/database/entities/RolePermission';
import { CreateRoleDto } from './dto/createRole.dto';
import { RoleWithPermissionsDto } from './dto/roleWithPermission.dto';
import { RedisService } from '../redis/redis.service';
import { Accounts } from 'src/database/entities/Accounts';

@Injectable()
export class RoleService {
  private readonly logger = new Logger(RoleService.name);
  private readonly CACHE_KEYS = {
    ROLE_LIST: 'role_list',
    ROLE_DETAIL: 'role_detail_',
    ROLE_PERMISSIONS: 'role_permissions_',
    ALL_PERMISSIONS: 'all_permissions',
  };
  private readonly CACHE_TTL = 600; // 10 phút (giây)

  constructor(
    @InjectRepository(Role)
    private readonly roleRepository: Repository<Role>,

    @InjectRepository(Permission)
    private readonly permissionRepository: Repository<Permission>,

    @InjectRepository(RolePermission)
    private readonly rolePermissionRepository: Repository<RolePermission>,

    private readonly redisService: RedisService,
  ) {}

  /**
   * Xóa cache khi có thay đổi dữ liệu
   */
  private async invalidateCache(key?: string): Promise<void> {
    try {
      if (key) {
        await this.redisService.del(key);
      } else {
        // Xóa cache danh sách vai trò
        await this.redisService.del(this.CACHE_KEYS.ROLE_LIST);

        // Xóa cache chi tiết vai trò
        const roleCacheKeys = await this.redisService.keys(
          `${this.CACHE_KEYS.ROLE_DETAIL}*`,
        );
        for (const cacheKey of roleCacheKeys) {
          await this.redisService.del(cacheKey);
        }

        // Xóa cache quyền của vai trò
        const permissionCacheKeys = await this.redisService.keys(
          `${this.CACHE_KEYS.ROLE_PERMISSIONS}*`,
        );
        for (const cacheKey of permissionCacheKeys) {
          await this.redisService.del(cacheKey);
        }

        // Xóa cache tất cả quyền
        await this.redisService.del(this.CACHE_KEYS.ALL_PERMISSIONS);
      }
    } catch (error) {
      this.logger.error(
        `Error invalidating cache: ${(error as Error).message}`,
        (error as Error).stack,
      );
    }
  }

  async getRoleNameById(roleId: number): Promise<string | null> {
    const cacheKey = `${this.CACHE_KEYS.ROLE_DETAIL}${roleId}_name`;
    try {
      // Thử lấy dữ liệu từ cache
      const cachedData = await this.redisService.get(cacheKey);
      if (cachedData) {
        return cachedData;
      }
      // Nếu không có trong cache, truy vấn database
      const role = await this.roleRepository.findOneBy({ id: roleId });
      if (!role) return null;

      // Lưu vào cache
      await this.redisService.set(cacheKey, role.name, this.CACHE_TTL);

      return role.name;
    } catch (error) {
      this.logger.error(
        `Error in getRoleNameById: ${(error as Error).message}`,
        (error as Error).stack,
      );
      const role = await this.roleRepository.findOneBy({ id: roleId });
      return role ? role.name : null;
    }
  }

  async findByName(name: string): Promise<Role | null> {
    const cacheKey = `${this.CACHE_KEYS.ROLE_DETAIL}name_${name}`;

    try {
      // Thử lấy dữ liệu từ cache
      const cachedData = await this.redisService.get(cacheKey);
      if (cachedData) {
        return JSON.parse(cachedData) as Role;
      }
      // Nếu không có trong cache, truy vấn database
      const role = await this.roleRepository.findOne({
        where: { name },
      });

      if (role) {
        // Lưu vào cache
        await this.redisService.set(
          cacheKey,
          JSON.stringify(role),
          this.CACHE_TTL,
        );
      }

      return role;
    } catch (error) {
      this.logger.error(
        `Error in findByName: ${(error as Error).message}`,
        (error as Error).stack,
      );

      // Nếu có lỗi với cache, vẫn truy vấn database
      return await this.roleRepository.findOne({
        where: { name },
      });
    }
  }

  async getPermissionsByRoleId(
    roleId: number,
  ): Promise<RoleWithPermissionsDto | null> {
    const cacheKey = `${this.CACHE_KEYS.ROLE_PERMISSIONS}${roleId}`;

    try {
      // Thử lấy dữ liệu từ cache
      const cachedData = await this.redisService.get(cacheKey);

      if (cachedData) {
        return JSON.parse(cachedData) as RoleWithPermissionsDto;
      }

      // Nếu không có trong cache, truy vấn database
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

      // Lưu vào cache
      await this.redisService.set(
        cacheKey,
        JSON.stringify(result),
        this.CACHE_TTL,
      );

      return result;
    } catch (error) {
      this.logger.error(
        `Error in getPermissionsByRoleId: ${(error as Error).message}`,
        (error as Error).stack,
      );

      // Nếu có lỗi với cache, vẫn truy vấn database
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

      return {
        id: role.id,
        name: role.name,
        permissions: permissions,
        createdAt: role.createdAt ?? undefined,
        updatedAt: role.updatedAt ?? undefined,
      };
    }
  }

  async getAllRolesWithPermissions() {
    const cacheKey = this.CACHE_KEYS.ROLE_LIST;

    try {
      // Thử lấy dữ liệu từ cache
      const cachedData = await this.redisService.get(cacheKey);

      if (cachedData) {
        return JSON.parse(cachedData) as RoleWithPermissionsDto[];
      }

      // Nếu không có trong cache, truy vấn database
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

      // Lưu vào cache
      await this.redisService.set(
        cacheKey,
        JSON.stringify(result),
        this.CACHE_TTL,
      );

      return result;
    } catch (error) {
      this.logger.error(
        `Error in getAllRolesWithPermissions: ${(error as Error).message}`,
        (error as Error).stack,
      );

      // Nếu có lỗi với cache, vẫn truy vấn database
      const roles = await this.roleRepository.find({
        relations: ['rolePermissions', 'rolePermissions.permission'],
        order: {
          updatedAt: 'DESC',
          createdAt: 'DESC',
        },
      });

      return roles.map((role) => ({
        id: role.id,
        name: role.name,
        permissions: role.rolePermissions.map(
          (rp) => `${rp.permission.resource}:${rp.permission.action}`,
        ),
        createdAt: role.createdAt ?? undefined,
        updatedAt: role.updatedAt ?? undefined,
      }));
    }
  }

  async getAllPermissions(): Promise<string[]> {
    const cacheKey = this.CACHE_KEYS.ALL_PERMISSIONS;

    try {
      // Thử lấy dữ liệu từ cache
      const cachedData = await this.redisService.get(cacheKey);

      if (cachedData) {
        return JSON.parse(cachedData) as string[];
      }

      // Nếu không có trong cache, truy vấn database
      const permissions = await this.permissionRepository.find();

      const permissionStrings = permissions.map(
        (permission) => `${permission.resource}:${permission.action}`,
      );

      // Lưu vào cache
      await this.redisService.set(
        cacheKey,
        JSON.stringify(permissionStrings),
        this.CACHE_TTL,
      );

      return permissionStrings;
    } catch (error) {
      this.logger.error(
        `Error in getAllPermissions: ${(error as Error).message}`,
        (error as Error).stack,
      );

      // Nếu có lỗi với cache, vẫn truy vấn database
      const permissions = await this.permissionRepository.find();

      return permissions.map(
        (permission) => `${permission.resource}:${permission.action}`,
      );
    }
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

    // Xóa cache sau khi tạo mới
    await this.invalidateCache();

    return result;
  }

  async updateRolePermissions(
    roleId: number,
    permissions: string[],
  ): Promise<RoleWithPermissionsDto> {
    const role = await this.roleRepository.findOneBy({ id: roleId });
    if (!role) {
      throw new NotFoundException(`Role with id ${roleId} not found.`);
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

    // Xóa cache sau khi cập nhật
    await this.invalidateCache();
    await this.invalidateCache(`${this.CACHE_KEYS.ROLE_PERMISSIONS}${roleId}`);
    await this.invalidateCache(`${this.CACHE_KEYS.ROLE_DETAIL}${roleId}`);

    return result;
  }

  async deleteRoleById(roleId: number): Promise<void> {
    const role = await this.roleRepository.findOne({
      where: { id: roleId },
    });

    if (!role) {
      throw new NotFoundException(`Role with ID ${roleId} not found`);
    }

    await this.roleRepository.remove(role);
    await this.invalidateCache();
  }

  // Lấy danh sách người dùng có quyền cụ thể
  async getUsersWithPermission(permission: string): Promise<Accounts[]> {
    try {
      // Tách resource và action từ permission string (format: resource:action)
      const [resource, action] = permission.split(':');

      if (!resource || !action) {
        throw new Error(`Invalid permission format: ${permission}`);
      }

      // Tìm permission entity
      const permissionEntity = await this.permissionRepository.findOne({
        where: {
          resource,
          action: action as ActionType,
        },
      });

      if (!permissionEntity) {
        throw new NotFoundException(`Permission ${permission} not found`);
      }

      // Tìm các role có permission này
      const rolePermissions = await this.rolePermissionRepository.find({
        where: {
          permissionId: permissionEntity.id,
        },
        relations: ['role'],
      });

      if (!rolePermissions || rolePermissions.length === 0) {
        return [];
      }

      // Lấy role IDs
      const roleIds = rolePermissions.map((rp) => rp.roleId);

      // Tìm tất cả người dùng có các role này
      const users = await this.roleRepository.manager
        .getRepository(Accounts)
        .createQueryBuilder('account')
        .innerJoinAndSelect('account.role', 'role')
        .where('role.id IN (:...roleIds)', { roleIds })
        .getMany();

      return users;
    } catch (error) {
      this.logger.error(
        `Error in getUsersWithPermission: ${(error as Error).message}`,
        (error as Error).stack,
      );
      throw error;
    }
  }
}
