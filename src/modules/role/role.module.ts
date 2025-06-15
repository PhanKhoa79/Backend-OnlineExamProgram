import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RoleController } from './role.controller';
import { RoleService } from './role.service';
import { Role } from 'src/database/entities/Role';
import { Permission } from 'src/database/entities/Permission';
import { RolePermission } from 'src/database/entities/RolePermission';
import { RedisModule } from '../redis/redis.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Role, Permission, RolePermission]),
    RedisModule,
  ],
  controllers: [RoleController],
  providers: [RoleService],
  exports: [RoleService],
})
export class RoleModule {}
