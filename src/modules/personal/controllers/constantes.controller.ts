import { Controller, Get } from '@nestjs/common';
import { ConstantsService } from '../services/constants.service';

@Controller('constantes')
export class ConstantesController {
  constructor(private readonly constantsService: ConstantsService) {}

  @Get('tipos-sangre')
  async getTiposSangre() {
    return this.constantsService.getBloodTypes();
  }

  @Get('estados')
  async getEstados() {
    return this.constantsService.getStates();
  }

  @Get('rangos')
  async getRangos() {
    return this.constantsService.getRanges();
  }
} 