import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, LessThanOrEqual } from 'typeorm';
import { Emergency } from './entities/emergency.entity';
import { CreateEmergencyDto } from './dto/create-emergency.dto';
import { User } from '../auth/entities/user.entity';
import { EmergencyType } from './entities/emergency-type.entity';
import { EmergencyFile } from './entities/emergency-file.entity';
import { Novelty } from './entities/novelty.entity';
import { EmergenciesNovelty } from './entities/emergencies-novelty.entity';
import { UpdateEmergencyDto } from './dto/update-emergency.dto';
import { EditEmergencyDto } from './dto/edit-emergency.dto';
import { QueryEmergencyDto, PeriodFilter } from './dto/query-emergency.dto';
import { addDays, addMonths, subDays, subMonths } from 'date-fns';
import { UploadApiResponse } from 'cloudinary';
import { LogActividad, TipoActividad } from '../logs/entities/log-actividad.entity';

@Injectable()
export class EmergenciesService {
  constructor(
    @InjectRepository(Emergency)
    private readonly emergencyRepository: Repository<Emergency>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(EmergencyType)
    private readonly emergencyTypeRepository: Repository<EmergencyType>,
    @InjectRepository(EmergencyFile)
    private readonly emergencyFileRepository: Repository<EmergencyFile>,
    @InjectRepository(Novelty)
    private readonly noveltyRepository: Repository<Novelty>,
    @InjectRepository(EmergenciesNovelty)
    private readonly emergenciesNoveltyRepository: Repository<EmergenciesNovelty>,
    @InjectRepository(LogActividad)
    private readonly logActividadRepository: Repository<LogActividad>,
  ) {}

  async create(createEmergencyDto: CreateEmergencyDto, uploadedFiles: UploadApiResponse[]): Promise<Emergency> {
    const user = await this.userRepository.findOne({ where: { id: createEmergencyDto.userId } });
    if (!user) throw new NotFoundException('Usuario no encontrado');

    const emergencyType = await this.emergencyTypeRepository.findOne({ where: { emergencyTypeId: createEmergencyDto.emergencyType } });
    if (!emergencyType) throw new NotFoundException('Tipo de emergencia no encontrado');

    // Extraer novedades del DTO
    const { novedades, ...emergencyData } = createEmergencyDto;

    const emergency = this.emergencyRepository.create({
      ...emergencyData,
      user,
      emergencyType,
    });

    const savedEmergency = await this.emergencyRepository.save(emergency);

    // Guardar los archivos solo si se proporcionaron
    if (uploadedFiles && uploadedFiles.length > 0) {
      for (const file of uploadedFiles) {
        const emergencyFile = this.emergencyFileRepository.create({
          file: file.secure_url,
          emergency: savedEmergency
        });
        await this.emergencyFileRepository.save(emergencyFile);
      }
    }

    // Guardar novedades y asociarlas a la emergencia si se proporcionaron
    if (novedades && novedades.length > 0) {
      for (const noveltyDto of novedades) {
        // Crear la novedad
        const novelty = this.noveltyRepository.create(noveltyDto);
        const savedNovelty = await this.noveltyRepository.save(novelty);

        // Asociar la novedad a la emergencia
        const emergencyNovelty = this.emergenciesNoveltyRepository.create({
          emergency: savedEmergency,
          novelty: savedNovelty
        });
        await this.emergenciesNoveltyRepository.save(emergencyNovelty);
      }
    }

    const foundEmergency = await this.emergencyRepository.findOne({
      where: { emergencyId: savedEmergency.emergencyId },
      relations: ['user', 'emergencyType', 'emergencyFiles', 'emergenciesNovelties', 'emergenciesNovelties.novelty']
    });

    if (!foundEmergency) {
      throw new NotFoundException('Error al recuperar la emergencia creada');
    }

    return foundEmergency;
  }

  private getDateRange(period: PeriodFilter, startDate?: string, endDate?: string) {
    const today = new Date();
    let start: Date;
    let end: Date = today;

    switch (period) {
      case PeriodFilter.LAST_7_DAYS:
        start = subDays(today, 7);
        break;
      case PeriodFilter.LAST_MONTH:
        start = subMonths(today, 1);
        break;
      case PeriodFilter.LAST_3_MONTHS:
        start = subMonths(today, 3);
        break;
      case PeriodFilter.LAST_6_MONTHS:
        start = subMonths(today, 6);
        break;
      case PeriodFilter.LAST_YEAR:
        start = subMonths(today, 12);
        break;
      case PeriodFilter.CUSTOM:
        if (!startDate || !endDate) {
          throw new BadRequestException('Las fechas de inicio y fin son requeridas para el periodo personalizado');
        }
        start = new Date(startDate);
        end = new Date(endDate);
        if (end > today) {
          throw new BadRequestException('La fecha final no puede ser mayor a la fecha actual');
        }
        break;
      default:
        throw new BadRequestException('Periodo no válido');
    }

    return { start, end };
  }

  async findAll(query: QueryEmergencyDto) {
    const { period, startDate, endDate, emergencyTypeId } = query;
    const { start, end } = this.getDateRange(period, startDate, endDate);

    const queryBuilder = this.emergencyRepository
      .createQueryBuilder('emergency')
      .leftJoinAndSelect('emergency.user', 'user')
      .leftJoinAndSelect('emergency.emergencyType', 'emergencyType')
      .leftJoinAndSelect('emergency.emergencyFiles', 'emergencyFiles')
      .where('emergency.emergencyDate BETWEEN :start AND :end', { start, end });

    if (emergencyTypeId) {
      queryBuilder.andWhere('emergency.emergencyType = :emergencyTypeId', {
        emergencyTypeId,
      });
    }

    const emergencies = await queryBuilder
      .orderBy('emergency.emergencyDate', 'DESC')
      .getMany();

    return emergencies;
  }

  findOne(id: number) {
    return this.emergencyRepository.findOne({ 
      where: { emergencyId: id },
      relations: ['user', 'emergencyType', 'emergencyFiles', 'emergenciesNovelties', 'emergenciesNovelties.novelty']
    });
  }

  async update(id: number, updateEmergencyDto: UpdateEmergencyDto) {
    const emergency = await this.emergencyRepository.findOne({ where: { emergencyId: id } });
    if (!emergency) throw new NotFoundException('Emergencia no encontrada');

    if (updateEmergencyDto.emergencyType) {
      const emergencyType = await this.emergencyTypeRepository.findOne({ 
        where: { emergencyTypeId: updateEmergencyDto.emergencyType } 
      });
      if (!emergencyType) throw new NotFoundException('Tipo de emergencia no encontrado');
      emergency.emergencyType = emergencyType;
    }

    Object.assign(emergency, updateEmergencyDto);
    return this.emergencyRepository.save(emergency);
  }

  async editEmergency(id: number, editEmergencyDto: EditEmergencyDto, adminUserInfo: any) {
    // Obtener el usuario administrador completo
    const adminUser = await this.userRepository.findOne({ 
      where: { id: adminUserInfo.id } 
    });
    
    if (!adminUser) {
      throw new NotFoundException('Usuario administrador no encontrado');
    }

    // Obtener la emergencia actual con todas sus relaciones
    const currentEmergency = await this.emergencyRepository.findOne({ 
      where: { emergencyId: id },
      relations: ['user', 'emergencyType']
    });
    
    if (!currentEmergency) {
      throw new NotFoundException('Emergencia no encontrada');
    }

    // Crear una copia de los datos originales para el log (excluyendo relaciones)
    const { user, emergencyType, emergencyFiles, emergenciesNovelties, ...originalData } = currentEmergency;

    // Validar tipo de emergencia si se está actualizando
    if (editEmergencyDto.emergencyType) {
      const emergencyType = await this.emergencyTypeRepository.findOne({ 
        where: { emergencyTypeId: editEmergencyDto.emergencyType } 
      });
      if (!emergencyType) {
        throw new NotFoundException('Tipo de emergencia no encontrado');
      }
      currentEmergency.emergencyType = emergencyType;
    }

    // Aplicar cambios (excluyendo editReason)
    const { editReason, ...updateData } = editEmergencyDto;
    Object.assign(currentEmergency, updateData);

    // Guardar la emergencia actualizada
    const updatedEmergency = await this.emergencyRepository.save(currentEmergency);

    // Crear registro de log de la edición
    const logEntry = this.logActividadRepository.create({
      tipo: TipoActividad.ACTUALIZACION,
      descripcion: `Emergencia editada por administrador${editReason ? `: ${editReason}` : ''}`,
      entidad: 'Emergency',
      entidadId: id,
      usuario: adminUser,
      datosAdicionales: {
        datosOriginales: originalData,
        cambiosRealizados: updateData,
        motivoEdicion: editReason || 'Sin motivo especificado'
      }
    });

    await this.logActividadRepository.save(logEntry);

    // Retornar la emergencia actualizada con relaciones
    return this.emergencyRepository.findOne({
      where: { emergencyId: id },
      relations: ['user', 'emergencyType', 'emergencyFiles', 'emergenciesNovelties', 'emergenciesNovelties.novelty']
    });
  }

  remove(id: number) {
    return this.emergencyRepository.delete(id);
  }
} 