import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SystemConfiguration } from './entities/system-config.entity';
import { UpdateTargetTimeDto } from './dto/system-config.dto';

@Injectable()
export class SystemConfigService {
  constructor(
    @InjectRepository(SystemConfiguration)
    private systemConfigRepository: Repository<SystemConfiguration>,
  ) {}

  async getTargetTime(): Promise<number> {
    const config = await this.systemConfigRepository.findOne({
      where: { key: 'target_response_time' }
    });

    if (!config) {
      // Si no existe, crear una configuración por defecto
      await this.createDefaultTargetTime();
      return 0; // Valor por defecto en minutos
    }

    return parseFloat(config.value);
  }

  async updateTargetTime(updateTargetTimeDto: UpdateTargetTimeDto): Promise<SystemConfiguration> {
    let config = await this.systemConfigRepository.findOne({
      where: { key: 'target_response_time' }
    });

    if (!config) {
      // Crear nueva configuración si no existe
      config = this.systemConfigRepository.create({
        key: 'target_response_time',
        value: updateTargetTimeDto.targetTime.toString(),
        description: updateTargetTimeDto.description || 'Tiempo objetivo de respuesta en minutos para emergencias',
        category: 'response_times'
      });
    } else {
      // Actualizar configuración existente
      config.value = updateTargetTimeDto.targetTime.toString();
      if (updateTargetTimeDto.description) {
        config.description = updateTargetTimeDto.description;
      }
    }

    return await this.systemConfigRepository.save(config);
  }

  async getAllConfigurations(): Promise<SystemConfiguration[]> {
    return await this.systemConfigRepository.find({
      order: { category: 'ASC', key: 'ASC' }
    });
  }

  async getConfigurationByKey(key: string): Promise<SystemConfiguration> {
    const config = await this.systemConfigRepository.findOne({ where: { key } });
    if (!config) {
      throw new NotFoundException(`Configuración con clave '${key}' no encontrada`);
    }
    return config;
  }

  private async createDefaultTargetTime(): Promise<void> {
    const defaultConfig = this.systemConfigRepository.create({
      key: 'target_response_time',
      value: '15',
      description: 'Tiempo objetivo de respuesta en minutos para emergencias',
      category: 'response_times'
    });

    await this.systemConfigRepository.save(defaultConfig);
  }
} 