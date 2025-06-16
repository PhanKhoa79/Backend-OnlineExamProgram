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
import { SubjectService } from './subject.service';
import { CreateSubjectDto } from './dto/create-subject.dto';
import { UpdateSubjectDto } from './dto/update-subject.dto';
import { SubjectResponseDto } from './dto/subject.dto';
import { SubjectMapper } from './mapper/subject.mapper';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Permissions } from '../auth/decorator/permissions.decotator';
import { PermissionsGuard } from '../auth/permissions.guard';
import { ActivityLog } from '../../common/decorators/activity-log.decorator';

@Controller('subject')
export class SubjectController {
  constructor(private readonly subjectService: SubjectService) {}

  @Post()
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions('subject:create')
  @ActivityLog({ action: 'CREATE', module: 'subject' })
  async create(
    @Body() createDto: CreateSubjectDto,
  ): Promise<SubjectResponseDto> {
    const created = await this.subjectService.create(createDto);
    return SubjectMapper.toResponseDto(created);
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions('subject:update')
  @ActivityLog({ action: 'UPDATE', module: 'subject' })
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateDto: UpdateSubjectDto,
  ): Promise<SubjectResponseDto> {
    const updated = await this.subjectService.update(id, updateDto);
    return SubjectMapper.toResponseDto(updated);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions('subject:delete')
  @ActivityLog({ action: 'DELETE', module: 'subject' })
  async delete(
    @Param('id', ParseIntPipe) id: number,
  ): Promise<{ message: string; data?: any }> {
    // Lấy thông tin môn học trước khi xóa
    const subject = await this.subjectService.findById(id);
    
    // Thực hiện xóa
    await this.subjectService.delete(id);
    
    return { 
      message: 'Xóa môn học thành công',
      data: subject // Trả về thông tin môn học đã xóa
    };
  }

  @Get(':code')
  @UseGuards(JwtAuthGuard)
  async findByCode(@Param('code') code: string): Promise<SubjectResponseDto> {
    const subject = await this.subjectService.findByCode(code);
    return SubjectMapper.toResponseDto(subject);
  }

  @Get('id/:id')
  @UseGuards(JwtAuthGuard)
  async findById(
    @Param('id', ParseIntPipe) id: number,
  ): Promise<SubjectResponseDto> {
    return await this.subjectService.findById(id);
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  async findAll(): Promise<SubjectResponseDto[]> {
    const subjects = await this.subjectService.findAll();
    return SubjectMapper.toResponseList(subjects);
  }
}
