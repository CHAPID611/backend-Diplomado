import { Controller, Get, Post, Body, Param, Delete, UseGuards } from '@nestjs/common';
import { NoveltiesService } from './novelties.service';
import { CreateNoveltyDto } from './dto/create-novelty.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { ROLES } from '../roles/constants/roles.constants';

@Controller('novedades')
@UseGuards(JwtAuthGuard, RolesGuard)
export class NoveltiesController {
  constructor(private readonly noveltiesService: NoveltiesService) {}

  @Post()
  @Roles(ROLES.OPERADOR, ROLES.ADMIN)
  create(@Body() createNoveltyDto: CreateNoveltyDto) {
    return this.noveltiesService.create(createNoveltyDto);
  }

  @Get()
  @Roles(ROLES.OPERADOR, ROLES.ADMIN)
  findAll() {
    return this.noveltiesService.findAll();
  }

  @Get('temporales')
  @Roles(ROLES.OPERADOR, ROLES.ADMIN)
  findTemporary() {
    return this.noveltiesService.findTemporary();
  }

  @Get(':id')
  @Roles(ROLES.OPERADOR, ROLES.ADMIN)
  findOne(@Param('id') id: string) {
    return this.noveltiesService.findOne(+id);
  }

  @Post(':emergencyId/novedades/:noveltyId')
  @Roles(ROLES.OPERADOR, ROLES.ADMIN)
  addNoveltyToEmergency(
    @Param('emergencyId') emergencyId: string,
    @Param('noveltyId') noveltyId: string,
  ) {
    return this.noveltiesService.addNoveltyToEmergency(+emergencyId, +noveltyId);
  }

  @Delete(':emergencyId/novedades/:noveltyId')
  @Roles(ROLES.OPERADOR, ROLES.ADMIN)
  removeNoveltyFromEmergency(
    @Param('emergencyId') emergencyId: string,
    @Param('noveltyId') noveltyId: string,
  ) {
    return this.noveltiesService.removeNoveltyFromEmergency(+emergencyId, +noveltyId);
  }
} 