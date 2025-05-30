import { Module } from '@nestjs/common';
import { Role } from 'src/database/entities/Role';
import { RoleService } from './role.service';
import { RoleController } from './role.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RolePermission } from 'src/database/entities/RolePermission';
import { Permission } from 'src/database/entities/Permission';

@Module({
  imports: [TypeOrmModule.forFeature([Role, RolePermission, Permission])],
  providers: [RoleService],
  controllers: [RoleController],
  exports: [RoleService],
})
export class RoleModule {}
