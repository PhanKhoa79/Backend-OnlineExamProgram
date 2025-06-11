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
  UseInterceptors,
} from '@nestjs/common';
import { SubjectService } from './subject.service';
import { CreateSubjectDto } from './dto/create-subject.dto';
import { UpdateSubjectDto } from './dto/update-subject.dto';
import { SubjectResponseDto } from './dto/subject.dto';
import { SubjectMapper } from './mapper/subject.mapper';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Permissions } from '../auth/decorator/permissions.decotator';
import { PermissionsGuard } from '../auth/permissions.guard';
import { Cache, CacheEvict } from 'src/common/decorators/cache.decorator';
import { CacheInterceptor } from 'src/common/interceptors/cache.interceptor';

@Controller('subject')
@UseInterceptors(CacheInterceptor)
export class SubjectController {
  constructor(private readonly subjectService: SubjectService) {}

  @Post()
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions('subject:create')
  @CacheEvict(['subject:*'])
  async create(
    @Body() createDto: CreateSubjectDto,
  ): Promise<SubjectResponseDto> {
    const created = await this.subjectService.create(createDto);
    return SubjectMapper.toResponseDto(created);
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions('subject:update')
  @CacheEvict(['subject:*'])
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
  @CacheEvict(['subject:*'])
  async delete(
    @Param('id', ParseIntPipe) id: number,
  ): Promise<{ message: string }> {
    await this.subjectService.delete(id);
    return { message: 'Xóa môn học thành công' };
  }

  @Get(':code')
  @UseGuards(JwtAuthGuard)
  @Cache({ key: 'subject:code:{code}', ttl: 900 })
  async findByCode(@Param('code') code: string): Promise<SubjectResponseDto> {
    const subject = await this.subjectService.findByCode(code);
    return SubjectMapper.toResponseDto(subject);
  }

  @Get('id/:id')
  @UseGuards(JwtAuthGuard)
  @Cache({ key: 'subject:id:{id}', ttl: 900 })
  async findById(
    @Param('id', ParseIntPipe) id: number,
  ): Promise<SubjectResponseDto> {
    return await this.subjectService.findById(id);
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  @Cache({ key: 'subject:list', ttl: 300 })
  async findAll(): Promise<SubjectResponseDto[]> {
    const subjects = await this.subjectService.findAll();
    return SubjectMapper.toResponseList(subjects);
  }
}
