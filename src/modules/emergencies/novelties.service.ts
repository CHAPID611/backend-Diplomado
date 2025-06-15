import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Novelty } from './entities/novelty.entity';
import { Emergency } from './entities/emergency.entity';
import { EmergenciesNovelty } from './entities/emergencies-novelty.entity';
import { CreateNoveltyDto } from './dto/create-novelty.dto';

@Injectable()
export class NoveltiesService {
  constructor(
    @InjectRepository(Novelty)
    private readonly noveltyRepository: Repository<Novelty>,
    @InjectRepository(Emergency)
    private readonly emergencyRepository: Repository<Emergency>,
    @InjectRepository(EmergenciesNovelty)
    private readonly emergenciesNoveltyRepository: Repository<EmergenciesNovelty>,
  ) {}

  async create(createNoveltyDto: CreateNoveltyDto) {
    const novelty = this.noveltyRepository.create(createNoveltyDto);
    return this.noveltyRepository.save(novelty);
  }

  async findAll() {
    return this.noveltyRepository.find();
  }

  async findOne(id: number) {
    const novelty = await this.noveltyRepository.findOne({ where: { noveltyId: id } });
    if (!novelty) {
      throw new NotFoundException('Novedad no encontrada');
    }
    return novelty;
  }

  async addNoveltyToEmergency(emergencyId: number, noveltyId: number) {
    const emergency = await this.emergencyRepository.findOne({ 
      where: { emergencyId },
      relations: ['emergenciesNovelties']
    });
    if (!emergency) {
      throw new NotFoundException('Emergencia no encontrada');
    }

    const novelty = await this.noveltyRepository.findOne({ where: { noveltyId } });
    if (!novelty) {
      throw new NotFoundException('Novedad no encontrada');
    }

    // Verificar si la novedades ya está asociada a la emergencia
    const existingNovelty = await this.emergenciesNoveltyRepository.findOne({
      where: {
        emergency: { emergencyId },
        novelty: { noveltyId }
      }
    });

    if (existingNovelty) {
      throw new NotFoundException('Esta novedad ya está asociada a la emergencia');
    }

    const emergencyNovelty = this.emergenciesNoveltyRepository.create({
      emergency,
      novelty
    });

    await this.emergenciesNoveltyRepository.save(emergencyNovelty);

    return this.emergencyRepository.findOne({
      where: { emergencyId },
      relations: ['emergenciesNovelties', 'emergenciesNovelties.novelty']
    });
  }

  async removeNoveltyFromEmergency(emergencyId: number, noveltyId: number) {
    const emergencyNovelty = await this.emergenciesNoveltyRepository.findOne({
      where: {
        emergency: { emergencyId },
        novelty: { noveltyId }
      }
    });

    if (!emergencyNovelty) {
      throw new NotFoundException('La novedad no está asociada a esta emergencia');
    }

    await this.emergenciesNoveltyRepository.remove(emergencyNovelty);

    return this.emergencyRepository.findOne({
      where: { emergencyId },
      relations: ['emergenciesNovelties', 'emergenciesNovelties.novelty']
    });
  }
} 