import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, LessThanOrEqual } from 'typeorm';
import { Emergency } from './entities/emergency.entity';
import { CreateEmergencyDto } from './dto/create-emergency.dto';
import { User } from '../auth/entities/user.entity';
import { EmergencyType } from './entities/emergency-type.entity';
import { EmergencyFile } from './entities/emergency-file.entity';
import { UpdateEmergencyDto } from './dto/update-emergency.dto';
import { QueryEmergencyDto, PeriodFilter } from './dto/query-emergency.dto';
import { addDays, addMonths, subDays, subMonths } from 'date-fns';
import { UploadApiResponse } from 'cloudinary';

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
  ) {}

  async create(createEmergencyDto: CreateEmergencyDto, uploadedFiles: UploadApiResponse[]): Promise<Emergency> {
    if (!uploadedFiles || uploadedFiles.length < 2) {
      throw new BadRequestException('Se requieren al menos dos fotografías');
    }

    const user = await this.userRepository.findOne({ where: { id: createEmergencyDto.userId } });
    if (!user) throw new NotFoundException('Usuario no encontrado');

    const emergencyType = await this.emergencyTypeRepository.findOne({ where: { emergencyTypeId: createEmergencyDto.emergencyType } });
    if (!emergencyType) throw new NotFoundException('Tipo de emergencia no encontrado');

    const emergency = this.emergencyRepository.create({
      ...createEmergencyDto,
      user,
      emergencyType,
    });

    const savedEmergency = await this.emergencyRepository.save(emergency);

    // Guardar los archivos
    for (const file of uploadedFiles) {
      const emergencyFile = this.emergencyFileRepository.create({
        file: file.secure_url,
        emergency: savedEmergency
      });
      await this.emergencyFileRepository.save(emergencyFile);
    }

    const foundEmergency = await this.emergencyRepository.findOne({
      where: { emergencyId: savedEmergency.emergencyId },
      relations: ['user', 'emergencyType', 'emergencyFiles']
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
    return this.emergencyRepository.findOne({ where: { emergencyId: id } });
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

  remove(id: number) {
    return this.emergencyRepository.delete(id);
  }
} 