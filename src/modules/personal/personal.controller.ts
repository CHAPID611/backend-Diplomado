import { Controller, Get, Post, Body, Param, Put, UseGuards } from '@nestjs/common';
import { PersonalService } from './personal.service';
import { CreatePersonalDto } from './dto/create-personal.dto';
import { UpdatePersonalDto } from './dto/update-personal.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { ROLES } from '../roles/constants/roles.constants';

@Controller('personal')
@UseGuards(JwtAuthGuard, RolesGuard)
export class PersonalController {
  constructor(private readonly personalService: PersonalService) {}

  @Post()
  @Roles(ROLES.ADMIN)
  create(@Body() createPersonalDto: CreatePersonalDto) {
    return this.personalService.create(createPersonalDto);
  }

  @Get()
  @Roles(ROLES.ADMIN, ROLES.OPERADOR)
  findAll() {
    return this.personalService.findAll();
  }

  @Get(':id')
  @Roles(ROLES.ADMIN, ROLES.OPERADOR)
  findOne(@Param('id') id: string) {
    return this.personalService.findOne(+id);
  }

  @Put(':id')
  @Roles(ROLES.ADMIN)
  update(@Param('id') id: string, @Body() updatePersonalDto: UpdatePersonalDto) {
    return this.personalService.update(+id, updatePersonalDto);
  }
} 