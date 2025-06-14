import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Emergency } from './entities/emergency.entity';
import { CreateEmergencyDto } from './dto/create-emergency.dto';
import { User } from '../auth/entities/user.entity';
import { EmergencyType } from './entities/emergency-type.entity';
import { EmergencyFile } from './entities/emergency-file.entity';
import { UpdateEmergencyDto } from './dto/update-emergency.dto';

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

  async create(createEmergencyDto: CreateEmergencyDto, fileUrl?: string): Promise<Emergency> {
    const user = await this.userRepository.findOne({ where: { id: createEmergencyDto.userId } });
    if (!user) throw new NotFoundException('Usuario no encontrado');

    const emergencyType = await this.emergencyTypeRepository.findOne({ where: { emergencyTypeId: createEmergencyDto.emergencyTypeId } });
    if (!emergencyType) throw new NotFoundException('Tipo de emergencia no encontrado');

    let emergencyFile: EmergencyFile | undefined = undefined;
    if (fileUrl) {
      emergencyFile = this.emergencyFileRepository.create({ file: fileUrl });
      await this.emergencyFileRepository.save(emergencyFile);
    } else if (createEmergencyDto.emergencyFileId) {
      const foundFile = await this.emergencyFileRepository.findOne({ where: { emergencyFileId: createEmergencyDto.emergencyFileId } });
      if (!foundFile) throw new NotFoundException('Archivo de emergencia no encontrado');
      emergencyFile = foundFile;
    }

    const emergency = this.emergencyRepository.create({
      ...createEmergencyDto,
      user,
      emergencyType,
      emergencyFile,
    });
    return this.emergencyRepository.save(emergency);
  }

  findAll() {
    return this.emergencyRepository.find();
  }

  findOne(id: number) {
    return this.emergencyRepository.findOne({ where: { emergencyId: id } });
  }

  update(id: number, updateEmergencyDto: UpdateEmergencyDto) {
    return this.emergencyRepository.update(id, updateEmergencyDto);
  }

  remove(id: number) {
    return this.emergencyRepository.delete(id);
  }
} 