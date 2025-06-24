import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
  ParseIntPipe,
  UseGuards,
} from '@nestjs/common';
import { ClassesService } from './classes.service';
import { CreateClassDto } from './dto/create-class.dto';
import { UpdateClassDto } from './dto/update-class.dto';
import { ClassResponseDto } from './dto/classes.dto';
import { ClassMapper } from './mapper/class.mapper';
import { PermissionsGuard } from '../auth/permissions.guard';
import { Permissions } from '../auth/decorator/permissions.decotator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ActivityLog } from '../../common/decorators/activity-log.decorator';

@Controller('classes')
export class ClassesController {
  constructor(private readonly classesService: ClassesService) {}

  @Post()
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions('class:create')
  @ActivityLog({ action: 'CREATE', module: 'class' })
  async create(@Body() createDto: CreateClassDto): Promise<ClassResponseDto> {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const entity = await this.classesService.create(createDto);
    return ClassMapper.toResponseDto(entity);
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions('class:update')
  @ActivityLog({ action: 'UPDATE', module: 'class' })
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateDto: UpdateClassDto,
  ): Promise<ClassResponseDto> {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const entity = await this.classesService.update(id, updateDto);
    return ClassMapper.toResponseDto(entity);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions('class:delete')
  @ActivityLog({ action: 'DELETE', module: 'class' })
  async delete(
    @Param('id', ParseIntPipe) id: number,
  ): Promise<{ message: string; data?: any }> {
    // Lấy thông tin lớp trước khi xóa
    const classEntity = await this.classesService.findById(id);
    const classData = ClassMapper.toResponseDto(classEntity);

    // Thực hiện xóa
    await this.classesService.delete(id);

    return {
      message: 'Xóa lớp học thành công',
      data: classData, // Trả về thông tin lớp đã xóa để interceptor lấy được
    };
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  async findById(
    @Param('id', ParseIntPipe) id: number,
  ): Promise<ClassResponseDto> {
    const entity = await this.classesService.findById(id);
    return ClassMapper.toResponseDto(entity);
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  async findAll(): Promise<ClassResponseDto[]> {
    const list = await this.classesService.findAll();
    return ClassMapper.toResponseList(list);
  }
}
