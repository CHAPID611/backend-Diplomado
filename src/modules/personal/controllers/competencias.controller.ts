import { Controller, Get } from '@nestjs/common';
import { CompetenciasService } from '../services/competencias.service';

@Controller('competencias')
export class CompetenciasController {
  constructor(private readonly competenciasService: CompetenciasService) {}

  @Get()
  async findAll() {
    return this.competenciasService.findAll();
  }

  @Get('agrupadas')
  async findGroupedByCategory() {
    return this.competenciasService.findGroupedByCategory();
  }
} 