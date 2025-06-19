import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
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
    console.log('=== CREATE PERSONAL ===');
    console.log('DTO recibido:', createPersonalDto);
    
    // Verificar si ya existe personal con la misma cédula
    const existingByCedula = await this.personalRepository.findOne({
      where: { idNumber: createPersonalDto.idNumber }
    });
    
    if (existingByCedula) {
      console.log('Ya existe personal con esta cédula:', existingByCedula.idNumber);
      throw new Error(`Ya existe personal registrado con la cédula ${createPersonalDto.idNumber}`);
    }

    // SOLUCIÓN TEMPORAL: Crear un usuario temporal para cada bombero
    // En producción, cada bombero debería tener su propio usuario real
    let targetUserId = createPersonalDto.userId;
    
    // Verificar si ya existe personal para este usuario (restricción OneToOne)
    const existingPersonal = await this.personalRepository.findOne({
      where: { userId: createPersonalDto.userId }
    });
    
    if (existingPersonal) {
      console.log('Ya existe personal para el usuario admin, creando usuario temporal...');
      
      // Crear un usuario temporal para este bombero
      const tempUser = this.userRepository.create({
        email: `bombero_${createPersonalDto.idNumber}@temp.bomberos.gov.co`,
        password: '$2b$10$temp.hash.for.demo.only', // Hash temporal para demo
        // No asignamos roles ya que es temporal
      });
      
      const savedTempUser = await this.userRepository.save(tempUser);
      targetUserId = savedTempUser.id;
      console.log('Usuario temporal creado con ID:', targetUserId);
    } else {
      // Verificar que el usuario original existe
      const user = await this.userRepository.findOne({ where: { id: createPersonalDto.userId } });
      if (!user) {
        throw new NotFoundException('Usuario no encontrado');
      }
      console.log('Usando usuario existente:', user.id, user.email);
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
      userId: targetUserId,
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
      email: createPersonalDto.email,
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
    console.log('=== UPDATE PERSONAL ID:', id, '===');
    console.log('DTO recibido:', updatePersonalDto);

    // Verificar que el personal existe
    const personal = await this.personalRepository.findOne({ 
      where: { personalId: id },
      relations: ['emergencyContact', 'employmentDataEntity', 'peopleCompetencias']
    });
    if (!personal) {
      throw new NotFoundException(`Personal con ID ${id} no encontrado`);
    }
    console.log('Personal encontrado:', personal.personalId);

    // Actualizar contacto de emergencia si se proporcionan datos
    if (updatePersonalDto.emergencyContact) {
      console.log('Actualizando contacto de emergencia...');
      const updateData = {};
      if (updatePersonalDto.emergencyContact.name !== undefined) {
        updateData['name'] = updatePersonalDto.emergencyContact.name;
      }
      if (updatePersonalDto.emergencyContact.relationship !== undefined) {
        updateData['relationship'] = updatePersonalDto.emergencyContact.relationship;
      }
      if (updatePersonalDto.emergencyContact.mobilePhone !== undefined) {
        updateData['mobilePhone'] = updatePersonalDto.emergencyContact.mobilePhone;
      }
      
      if (Object.keys(updateData).length > 0) {
        await this.contactoEmergenciaRepository.update(
          { emergencyContactId: personal.emergencyContactId },
          updateData
        );
      }
    }

    // Actualizar datos de empleo si se proporcionan datos
    if (updatePersonalDto.employmentData) {
      console.log('Actualizando datos de empleo...');
      const updateData = {};
      if (updatePersonalDto.employmentData.rangeId !== undefined) {
        updateData['rangeId'] = updatePersonalDto.employmentData.rangeId;
      }
      if (updatePersonalDto.employmentData.stateId !== undefined) {
        updateData['stateId'] = updatePersonalDto.employmentData.stateId;
      }
      if (updatePersonalDto.employmentData.admissionDate !== undefined) {
        updateData['admissionDate'] = updatePersonalDto.employmentData.admissionDate;
      }
      if (updatePersonalDto.employmentData.yearsOfExperience !== undefined) {
        updateData['yearsOfExperience'] = updatePersonalDto.employmentData.yearsOfExperience;
      }
      if (updatePersonalDto.employmentData.observations !== undefined) {
        updateData['observations'] = updatePersonalDto.employmentData.observations;
      }
      
      if (Object.keys(updateData).length > 0) {
        await this.employmentDataRepository.update(
          { employmentDataId: personal.employmentDataId },
          updateData
        );
      }
    }

    // Actualizar competencias si se proporcionan
    if (updatePersonalDto.competencias && Array.isArray(updatePersonalDto.competencias)) {
      console.log('Actualizando competencias...', updatePersonalDto.competencias);
      
      try {
        // Eliminar competencias existentes
        await this.peopleCompetenciasRepository
          .createQueryBuilder()
          .delete()
          .from('peopleCompetencias')
          .where('personalId = :id', { id })
          .execute();
        
        console.log('Competencias existentes eliminadas');

        // Crear las nuevas relaciones
        const nuevasCompetencias = updatePersonalDto.competencias.map(competenciaId => ({
          personal: { personalId: id },
          competencia: { competenciaId: Number(competenciaId) }
        }));

        // Insertar nuevas relaciones si hay
        if (nuevasCompetencias.length > 0) {
          await this.peopleCompetenciasRepository
            .createQueryBuilder()
            .insert()
            .into('peopleCompetencias')
            .values(nuevasCompetencias)
            .execute();
          
          console.log(`${nuevasCompetencias.length} nuevas competencias agregadas`);
        }
      } catch (error) {
        console.error('Error actualizando competencias:', error);
        throw new Error('Error al actualizar competencias: ' + error.message);
      }
    }

    // Actualizar datos básicos del personal solo si se proporcionan
    const updateData = {};
    if (updatePersonalDto.idNumber !== undefined) updateData['idNumber'] = updatePersonalDto.idNumber;
    if (updatePersonalDto.firstName !== undefined) updateData['firstName'] = updatePersonalDto.firstName;
    if (updatePersonalDto.secondName !== undefined) updateData['secondName'] = updatePersonalDto.secondName;
    if (updatePersonalDto.firstLastName !== undefined) updateData['firstLastName'] = updatePersonalDto.firstLastName;
    if (updatePersonalDto.secondLastName !== undefined) updateData['secondLastName'] = updatePersonalDto.secondLastName;
    if (updatePersonalDto.birthDate !== undefined) updateData['birthDate'] = updatePersonalDto.birthDate;
    if (updatePersonalDto.address !== undefined) updateData['address'] = updatePersonalDto.address;
    if (updatePersonalDto.phoneNumber !== undefined) updateData['phoneNumber'] = updatePersonalDto.phoneNumber;
    if (updatePersonalDto.email !== undefined) updateData['email'] = updatePersonalDto.email;
    if (updatePersonalDto.bloodTypeId !== undefined) updateData['bloodTypeId'] = updatePersonalDto.bloodTypeId;

    if (Object.keys(updateData).length > 0) {
      await this.personalRepository.update(
        { personalId: id },
        updateData
      );
    }

    // Retornar el personal actualizado con todas sus relaciones
    return this.findOne(id);
  }

  async remove(id: number) {
    console.log(`=== DELETE PERSONAL ID: ${id} ===`);
    
    const personal = await this.personalRepository.findOne({
      where: { personalId: id },
      relations: ['user', 'emergencyContact', 'employmentDataEntity', 'peopleCompetencias'],
    });

    if (!personal) {
      throw new NotFoundException('Personal no encontrado');
    }

    console.log('Personal encontrado para eliminación:', personal.personalId);
    console.log('Emergency Contact ID:', personal.emergencyContactId);
    console.log('Employment Data ID:', personal.employmentDataId);

    try {
      // PASO 1: Eliminar relaciones de competencias (tablas de unión primero)
      const competenciasRelations = await this.peopleCompetenciasRepository.find({
        where: { personalId: id }
      });
      
      if (competenciasRelations.length > 0) {
        console.log(`Eliminando ${competenciasRelations.length} relaciones de competencias...`);
        await this.peopleCompetenciasRepository.remove(competenciasRelations);
        console.log('Relaciones de competencias eliminadas');
      }

      // PASO 2: Eliminar el registro de personal (que tiene las FKs)
      console.log('Eliminando registro de personal...');
      await this.personalRepository.remove(personal);
      console.log('Registro de personal eliminado');

      // PASO 3: Eliminar contacto de emergencia (ahora que no está referenciado)
      if (personal.emergencyContact) {
        console.log('Eliminando contacto de emergencia...');
        await this.contactoEmergenciaRepository.remove(personal.emergencyContact);
        console.log('Contacto de emergencia eliminado');
      }

      // PASO 4: Eliminar datos de empleo (ahora que no está referenciado)
      if (personal.employmentDataEntity) {
        console.log('Eliminando datos de empleo...');
        await this.employmentDataRepository.remove(personal.employmentDataEntity);
        console.log('Datos de empleo eliminados');
      }

      // PASO 5: Eliminar usuario temporal si es necesario
      if (personal.user && personal.user.email && personal.user.email.includes('@temp.bomberos.gov.co')) {
        console.log('Eliminando usuario temporal...');
        await this.userRepository.remove(personal.user);
        console.log('Usuario temporal eliminado');
      }

      console.log('Personal eliminado exitosamente');
      return { message: 'Personal eliminado exitosamente' };
      
    } catch (error) {
      console.error('Error durante la eliminación:', error);
      throw error;
    }
  }
} 