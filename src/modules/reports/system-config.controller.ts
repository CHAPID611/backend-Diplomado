import { Controller, Get, Put, Body, UseGuards, HttpStatus } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { SystemConfigService } from './system-config.service';
import { UpdateTargetTimeDto } from './dto/system-config.dto';

@Controller('system-config')
@UseGuards(JwtAuthGuard)
export class SystemConfigController {
  constructor(private readonly systemConfigService: SystemConfigService) {}

  @Get('target-time')
  async getTargetTime() {
    const targetTime = await this.systemConfigService.getTargetTime();
    return {
      statusCode: HttpStatus.OK,
      message: 'Tiempo objetivo obtenido exitosamente',
      data: { targetTime }
    };
  }

  @Put('target-time')
  @UseGuards(RolesGuard)
  @Roles('admin')
  async updateTargetTime(@Body() updateTargetTimeDto: UpdateTargetTimeDto) {
    const config = await this.systemConfigService.updateTargetTime(updateTargetTimeDto);
    return {
      statusCode: HttpStatus.OK,
      message: 'Tiempo objetivo actualizado exitosamente',
      data: {
        targetTime: parseFloat(config.value),
        description: config.description,
        updatedAt: config.updatedAt
      }
    };
  }

  @Get('configurations')
  @UseGuards(RolesGuard)
  @Roles('admin')
  async getAllConfigurations() {
    const configurations = await this.systemConfigService.getAllConfigurations();
    return {
      statusCode: HttpStatus.OK,
      message: 'Configuraciones obtenidas exitosamente',
      data: configurations
    };
  }
} 