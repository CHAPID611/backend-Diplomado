import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Personal } from './entities/personal.entity';
import { CreatePersonalDto } from './dto/create-personal.dto';
import { UpdatePersonalDto } from './dto/update-personal.dto';
import { User } from '../auth/entities/user.entity';
import { ContactoEmergencia } from './entities/contacto-emergencia.entity';
import { PeopleCompetencias } from './entities/people-competencias.entity';
import { Competencias } from './entities/competencias.entity';
import { EmploymentData } from './entities/employment-data.entity';

@Injectable()
export class PersonalService {
  constructor(
    @InjectRepository(Personal)
    private readonly personalRepository: Repository<Personal>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(ContactoEmergencia)
    private readonly contactoEmergenciaRepository: Repository<ContactoEmergencia>,
    @InjectRepository(PeopleCompetencias)
    private readonly peopleCompetenciasRepository: Repository<PeopleCompetencias>,
    @InjectRepository(Competencias)
    private readonly competenciasRepository: Repository<Competencias>,
    @InjectRepository(EmploymentData)
    private readonly employmentDataRepository: Repository<EmploymentData>,
  ) {}

  async create(createPersonalDto: CreatePersonalDto) {
    const user = await this.userRepository.findOne({ where: { id: createPersonalDto.userId } });
    if (!user) {
      throw new NotFoundException('Usuario no encontrado');
    }

    // Crear contacto de emergencia
    const contactoEmergencia = this.contactoEmergenciaRepository.create({
      name: createPersonalDto.emergencyContact.name,
      relationship: createPersonalDto.emergencyContact.relationship,
      mobilePhone: createPersonalDto.emergencyContact.mobilePhone,
    });
    const savedContacto = await this.contactoEmergenciaRepository.save(contactoEmergencia);

    // Crear datos de empleo
    const employmentData = this.employmentDataRepository.create({
      rangeId: createPersonalDto.employmentData.rangeId,
      stateId: createPersonalDto.employmentData.stateId,
      admissionDate: new Date(createPersonalDto.employmentData.admissionDate),
      yearsOfExperience: createPersonalDto.employmentData.yearsOfExperience,
      observations: createPersonalDto.employmentData.observations,
    });
    const savedEmployment = await this.employmentDataRepository.save(employmentData);

    // Crear personal
    const personal = this.personalRepository.create({
      userId: createPersonalDto.userId,
      bloodTypeId: createPersonalDto.bloodTypeId,
      employmentDataId: savedEmployment.employmentDataId,
      emergencyContactId: savedContacto.emergencyContactId,
      firstName: createPersonalDto.firstName,
      secondName: createPersonalDto.secondName,
      firstLastName: createPersonalDto.firstLastName,
      secondLastName: createPersonalDto.secondLastName,
      idNumber: createPersonalDto.idNumber,
      birthDate: new Date(createPersonalDto.birthDate),
      address: createPersonalDto.address,
      phoneNumber: createPersonalDto.phoneNumber,
    });
    const savedPersonal = await this.personalRepository.save(personal);

    // Crear relaciones de competencias
    for (const competenciaId of createPersonalDto.competencias) {
      const competencia = await this.competenciasRepository.findOne({ where: { competenciaId } });
      if (competencia) {
        const peopleCompetencia = this.peopleCompetenciasRepository.create({
          personalId: savedPersonal.personalId,
          competenciaId: competenciaId,
        });
        await this.peopleCompetenciasRepository.save(peopleCompetencia);
      }
    }

    return this.findOne(savedPersonal.personalId);
  }

  findAll() {
    return this.personalRepository.find({
      relations: ['user', 'emergencyContact', 'employmentDataEntity', 'peopleCompetencias', 'peopleCompetencias.competencia'],
    });
  }

  async findOne(id: number) {
    const personal = await this.personalRepository.findOne({
      where: { personalId: id },
      relations: ['user', 'emergencyContact', 'employmentDataEntity', 'peopleCompetencias', 'peopleCompetencias.competencia'],
    });

    if (!personal) {
      throw new NotFoundException('Personal no encontrado');
    }

    return personal;
  }

  async update(id: number, updatePersonalDto: UpdatePersonalDto) {
    const personal = await this.personalRepository.findOne({
      where: { personalId: id },
      relations: ['emergencyContact', 'employmentDataEntity', 'peopleCompetencias'],
    });

    if (!personal) {
      throw new NotFoundException('Personal no encontrado');
    }

    // Actualizar datos básicos del personal
    if (updatePersonalDto.firstName) personal.firstName = updatePersonalDto.firstName;
    if (updatePersonalDto.secondName) personal.secondName = updatePersonalDto.secondName;
    if (updatePersonalDto.firstLastName) personal.firstLastName = updatePersonalDto.firstLastName;
    if (updatePersonalDto.secondLastName) personal.secondLastName = updatePersonalDto.secondLastName;
    if (updatePersonalDto.idNumber) personal.idNumber = updatePersonalDto.idNumber;
    if (updatePersonalDto.birthDate) personal.birthDate = new Date(updatePersonalDto.birthDate);
    if (updatePersonalDto.address) personal.address = updatePersonalDto.address;
    if (updatePersonalDto.phoneNumber) personal.phoneNumber = updatePersonalDto.phoneNumber;
    if (updatePersonalDto.bloodTypeId) personal.bloodTypeId = updatePersonalDto.bloodTypeId;

    // Actualizar contacto de emergencia
    if (updatePersonalDto.emergencyContact) {
      Object.assign(personal.emergencyContact, updatePersonalDto.emergencyContact);
      await this.contactoEmergenciaRepository.save(personal.emergencyContact);
    }

    // Actualizar datos de empleo
    if (updatePersonalDto.employmentData) {
      Object.assign(personal.employmentDataEntity, updatePersonalDto.employmentData);
      await this.employmentDataRepository.save(personal.employmentDataEntity);
    }

    // Si se actualizan las competencias
    if (updatePersonalDto.competencias) {
      // Eliminar competencias existentes
      await this.peopleCompetenciasRepository.delete({ personalId: id });

      // Crear nuevas relaciones de competencias
      for (const competenciaId of updatePersonalDto.competencias) {
        const competencia = await this.competenciasRepository.findOne({ where: { competenciaId: Number(competenciaId) } });
        if (competencia) {
          const peopleCompetencia = this.peopleCompetenciasRepository.create({
            personalId: id,
            competenciaId: Number(competenciaId),
          });
          await this.peopleCompetenciasRepository.save(peopleCompetencia);
        }
      }
    }

    return this.personalRepository.save(personal);
  }
} 