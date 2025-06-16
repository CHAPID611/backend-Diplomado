import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BloodType } from '../entities/blood-type.entity';
import { States } from '../entities/states.entity';
import { Ranges } from '../entities/ranges.entity';

@Injectable()
export class ConstantsService {
  constructor(
    @InjectRepository(BloodType)
    private readonly bloodTypeRepository: Repository<BloodType>,
    @InjectRepository(States)
    private readonly statesRepository: Repository<States>,
    @InjectRepository(Ranges)
    private readonly rangesRepository: Repository<Ranges>,
  ) {}

  async getBloodTypes() {
    return this.bloodTypeRepository.find();
  }

  async getStates() {
    return this.statesRepository.find();
  }

  async getRanges() {
    return this.rangesRepository.find();
  }
} 