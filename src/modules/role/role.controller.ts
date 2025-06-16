import {
  Body,
  Controller,
  Get,
  HttpException,
  Param,
  ParseIntPipe,
  Post,
  UseGuards,
  HttpStatus,
  Delete,
  Put,
  UseInterceptors
} from '@nestjs/common';
import { RoleService } from './role.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PermissionsGuard } from '../auth/permissions.guard';
import { Permissions } from '../auth/decorator/permissions.decotator';
import { CreateRoleDto } from './dto/createRole.dto';
import { RoleWithPermissionsDto } from './dto/roleWithPermission.dto';
import { ActivityLog } from '../../common/decorators/activity-log.decorator';

@Controller('role')
export class RoleController {
  constructor(private readonly roleService: RoleService) {}

  @Get()
  @UseGuards(JwtAuthGuard)
  async getAllRolesWithPermissions() {
    const data = await this.roleService.getAllRolesWithPermissions();
    return data;
  }

  @Get(':id/permissions')
  @UseGuards(JwtAuthGuard)
  async getPermissionsByRoleId(
    @Param('id', ParseIntPipe) roleId: number,
  ): Promise<RoleWithPermissionsDto | null> {
    return await this.roleService.getPermissionsByRoleId(roleId);
  }

  @Get('name/:name')
  @UseGuards(JwtAuthGuard)
  async getRoleByName(@Param('name') name: string) {
    const role = await this.roleService.findByName(name);
    if (!role) {
      throw new HttpException('Role not found', HttpStatus.NOT_FOUND);
    }
    return role;
  }

  @Get('permissions/all')
  @UseGuards(JwtAuthGuard)
  async getAllPermissions() {
    const permissions = await this.roleService.getAllPermissions();
    return { permissions };
  }

  @Post()
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions('role:create')
  @ActivityLog({ action: 'CREATE', module: 'role' })
  async createRole(
    @Body() createRoleDto: CreateRoleDto,
  ): Promise<RoleWithPermissionsDto> {
    try {
      const newRole =
        await this.roleService.createRoleWithPermissions(createRoleDto);
      return newRole;
    } catch (error: any) {
      throw new HttpException(error.message, HttpStatus.BAD_REQUEST);
    }
  }

  @Put(':id/permissions')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions('role:update')
  @ActivityLog({
    action: 'UPDATE',
    module: 'role',
    description: 'đã cập nhật quyền cho role',
  })
  async updatePermissions(
    @Param('id', ParseIntPipe) roleId: number,
    @Body('permissions') permissions: string[],
  ) {
    const updatedRole = await this.roleService.updateRolePermissions(
      roleId,
      permissions,
    );
    return updatedRole;
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions('role:delete')
  @ActivityLog({ action: 'DELETE', module: 'role' })
  async deleteRole(@Param('id', ParseIntPipe) id: number) {
    try {
      // Lấy thông tin role trước khi xóa
      const role = await this.roleService.getPermissionsByRoleId(id);
      
      // Thực hiện xóa
      await this.roleService.deleteRoleById(id);
      
      return { 
        message: `Role with id ${id} deleted successfully.`,
        data: role // Trả về thông tin role đã xóa
      };
    } catch (error: any) {
      throw new HttpException(error.message, HttpStatus.BAD_REQUEST);
    }
  }
}
