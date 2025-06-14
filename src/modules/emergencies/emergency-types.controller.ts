import { Controller, Get, Post, Body, UseGuards } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EmergencyType } from './entities/emergency-type.entity';
import { CreateEmergencyTypeDto } from './dto/create-emergency-type.dto';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { ROLES } from '../roles/constants/roles.constants';

@Controller('emergency-types')
@UseGuards(RolesGuard)
export class EmergencyTypesController {
  constructor(
    @InjectRepository(EmergencyType)
    private readonly emergencyTypeRepository: Repository<EmergencyType>,
  ) {}

  @Get()
  async findAll() {
    return this.emergencyTypeRepository.find();
  }

  @Post()
  @Roles(ROLES.ADMIN)
  async create(@Body() createEmergencyTypeDto: CreateEmergencyTypeDto) {
    const emergencyType = this.emergencyTypeRepository.create(createEmergencyTypeDto);
    return this.emergencyTypeRepository.save(emergencyType);
  }
} 