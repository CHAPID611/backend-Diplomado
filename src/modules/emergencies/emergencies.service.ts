import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, LessThanOrEqual, DeepPartial } from 'typeorm';
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
import { Vehicle } from '../vehicles/entities/vehicle.entity';
import { VehicleStatus } from '../vehicles/enums/vehicle-status.enum';
import { Personal } from '../personal/entities/personal.entity';
import { EmploymentData } from '../personal/entities/employment-data.entity';
import { Ranges } from '../personal/entities/ranges.entity';

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
    @InjectRepository(Vehicle)
    private readonly vehicleRepository: Repository<Vehicle>,
    @InjectRepository(Personal)
    private readonly personalRepository: Repository<Personal>,
    @InjectRepository(EmploymentData)
    private readonly employmentDataRepository: Repository<EmploymentData>,
    @InjectRepository(Ranges)
    private readonly rangesRepository: Repository<Ranges>,
  ) {}

  async create(createEmergencyDto: CreateEmergencyDto, uploadedFiles: UploadApiResponse[]): Promise<Emergency> {
    const user = await this.userRepository.findOne({ where: { id: createEmergencyDto.userId } });
    if (!user) throw new NotFoundException('Usuario no encontrado');

    const emergencyType = await this.emergencyTypeRepository.findOne({ where: { emergencyTypeId: createEmergencyDto.emergencyType } });
    if (!emergencyType) throw new NotFoundException('Tipo de emergencia no encontrado');

    // Extraer novedades, vehicleIds y personnelIds del DTO
    const { novedades, vehicleIds: rawVehicleIds, personnelIds, ...emergencyData } = createEmergencyDto;

    // Asegurar que vehicleIds sea un array
    const vehicleIds = Array.isArray(rawVehicleIds) ? rawVehicleIds : [rawVehicleIds].filter(id => id != null);

    // Buscar los vehículos
    const vehicles = await Promise.all(
      vehicleIds.map(async (id) => {
        const vehicle = await this.vehicleRepository.findOne({ where: { vehicleId: id } });
        if (!vehicle) {
          throw new NotFoundException(`Vehículo con ID ${id} no encontrado`);
        }
        return vehicle;
      })
    );

    // Buscar y validar el personal seleccionado
    let personnel: Personal[] = [];
    let guardPersonnelString = '';
    
    if (personnelIds && personnelIds.length > 0) {
      // Verificar que el personal esté disponible
      const unavailablePersonnel = await this.getUnavailablePersonnel(personnelIds);
      if (unavailablePersonnel.length > 0) {
        const names = unavailablePersonnel.map(p => `${p.firstName} ${p.firstLastName}`).join(', ');
        throw new BadRequestException(`El siguiente personal no está disponible: ${names}`);
      }

      personnel = await Promise.all(
        personnelIds.map(async (id) => {
          const person = await this.personalRepository.findOne({ 
            where: { personalId: id },
            relations: ['employmentDataEntity', 'employmentDataEntity.rangeEntity']
          });
          if (!person) {
            throw new NotFoundException(`Personal con ID ${id} no encontrado`);
          }
          return person;
        })
      );

      // Generar el string de guardPersonnel para compatibilidad
      guardPersonnelString = personnel.map(p => {
        const rangeName = p.employmentDataEntity?.rangeEntity?.range || 'Sin Rango';
        return `${rangeName} ${p.firstName} ${p.firstLastName}`;
      }).join(', ');
    } else {
      // Si no se seleccionó personal, usar el valor del DTO si existe
      guardPersonnelString = createEmergencyDto.guardPersonnel || '';
    }

    // Guardar la emergencia con los vehículos y personal
    const savedEmergency = await this.emergencyRepository.save({
      ...emergencyData,
      guardPersonnel: guardPersonnelString,
      user,
      emergencyType,
      vehicles,
      personnel
    } as DeepPartial<Emergency>);

    if (!savedEmergency) {
      throw new NotFoundException('Error al crear la emergencia');
    }

    // Actualizar el estado de los vehículos a 'en_emergencia'
    await Promise.all(
      vehicles.map(async (vehicle) => {
        vehicle.status = VehicleStatus.IN_EMERGENCY;
        await this.vehicleRepository.save(vehicle);
      })
    );

    // Guardar los archivos solo si se proporcionaron
    if (uploadedFiles && uploadedFiles.length > 0) {
      for (const file of uploadedFiles) {
        const emergencyFile = this.emergencyFileRepository.create({
          file: file.secure_url,
          emergencyId: savedEmergency.emergencyId
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

    return savedEmergency;
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

  // Métodos para gestión de personal

  /**
   * Obtiene todo el personal disponible (no asignado a emergencias activas)
   */
  async getAvailablePersonnel(): Promise<Personal[]> {
    // Personal que NO está en emergencias activas (sin returnEstationTime)
    const occupiedPersonnelIds = await this.emergencyRepository
      .createQueryBuilder('emergency')
      .innerJoin('emergency.personnel', 'personnel')
      .select('personnel.personalId')
      .where('emergency.returnEstationTime IS NULL OR emergency.returnEstationTime > NOW()')
      .getRawMany();

    const occupiedIds = occupiedPersonnelIds.map(p => p.personnel_personalId);

    const queryBuilder = this.personalRepository
      .createQueryBuilder('personal')
      .leftJoinAndSelect('personal.employmentDataEntity', 'employmentData')
      .leftJoinAndSelect('employmentData.rangeEntity', 'range')
      .leftJoinAndSelect('employmentData.stateEntity', 'state');

    if (occupiedIds.length > 0) {
      queryBuilder.where('personal.personalId NOT IN (:...occupiedIds)', { occupiedIds });
    }

    return queryBuilder
      .orderBy('range.range', 'ASC')
      .addOrderBy('personal.firstName', 'ASC')
      .getMany();
  }

  /**
   * Verifica qué personal de una lista no está disponible
   */
  async getUnavailablePersonnel(personnelIds: number[]): Promise<Personal[]> {
    if (!personnelIds || personnelIds.length === 0) {
      return [];
    }

    // Buscar personal que está en emergencias activas
    const occupiedPersonnel = await this.emergencyRepository
      .createQueryBuilder('emergency')
      .innerJoin('emergency.personnel', 'personnel')
      .leftJoinAndSelect('personnel.employmentDataEntity', 'employmentData')
      .leftJoinAndSelect('employmentData.rangeEntity', 'range')
      .where('personnel.personalId IN (:...personnelIds)', { personnelIds })
      .andWhere('emergency.returnEstationTime IS NULL OR emergency.returnEstationTime > NOW()')
      .select(['personnel'])
      .getMany();

    return occupiedPersonnel.flatMap(e => e.personnel);
  }

  /**
   * Obtiene todas las emergencias activas (sin retorno a estación)
   */
  async getActiveEmergencies(): Promise<Emergency[]> {
    return this.emergencyRepository
      .createQueryBuilder('emergency')
      .leftJoinAndSelect('emergency.personnel', 'personnel')
      .leftJoinAndSelect('personnel.employmentDataEntity', 'employmentData')
      .leftJoinAndSelect('employmentData.rangeEntity', 'range')
      .leftJoinAndSelect('emergency.emergencyType', 'emergencyType')
      .leftJoinAndSelect('emergency.user', 'user')
      .leftJoinAndSelect('emergency.vehicles', 'vehicles')
      .where('emergency.returnEstationTime IS NULL OR emergency.returnEstationTime > NOW()')
      .orderBy('emergency.emergencyDate', 'DESC')
      .getMany();
  }

  /**
   * Marca una emergencia como completada (regreso a estación)
   * Esto libera automáticamente al personal y vehículos
   */
  async completeEmergency(emergencyId: number, returnStationTime: Date, description?: string): Promise<Emergency> {
    const emergency = await this.emergencyRepository.findOne({
      where: { emergencyId },
      relations: ['personnel', 'vehicles']
    });

    if (!emergency) {
      throw new NotFoundException('Emergencia no encontrada');
    }

    // Actualizar la emergencia
    emergency.returnEstationTime = returnStationTime;
    if (description) {
      emergency.returnEstationTimeDescription = description;
    }

    // Liberar vehículos
    if (emergency.vehicles) {
      await Promise.all(
        emergency.vehicles.map(async (vehicle) => {
          vehicle.status = VehicleStatus.AVAILABLE;
          await this.vehicleRepository.save(vehicle);
        })
      );
    }

    return this.emergencyRepository.save(emergency);
  }

  /**
   * Formatea la información del personal para uso en el frontend
   */
  formatPersonnelForFrontend(personnel: Personal[]): any[] {
    return personnel.map(person => ({
      id: person.personalId,
      personalId: person.personalId,
      nombre: `${person.firstName} ${person.firstLastName}`,
      nombreCompleto: `${person.firstName} ${person.secondName || ''} ${person.firstLastName} ${person.secondLastName || ''}`.trim(),
      rango: person.employmentDataEntity?.rangeEntity?.range || 'Sin Rango',
      rangoId: person.employmentDataEntity?.rangeEntity?.rangeId,
             estado: person.employmentDataEntity?.stateEntity?.state || 'Activo',
      email: person.email,
      telefono: person.phoneNumber,
      experiencia: person.employmentDataEntity?.yearsOfExperience || 0,
      activo: true
    }));
  }
} 