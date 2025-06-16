import { DataSource } from 'typeorm';
import { BloodType } from '../../modules/personal/entities/blood-type.entity';

export async function seedBloodTypes(dataSource: DataSource): Promise<void> {
  const bloodTypeRepository = dataSource.getRepository(BloodType);

  const bloodTypes = [
    { bloodType: 'A+' },
    { bloodType: 'A-' },
    { bloodType: 'B+' },
    { bloodType: 'B-' },
    { bloodType: 'AB+' },
    { bloodType: 'AB-' },
    { bloodType: 'O+' },
    { bloodType: 'O-' }
  ];

  for (const bloodTypeData of bloodTypes) {
    const exists = await bloodTypeRepository.findOne({
      where: { bloodType: bloodTypeData.bloodType }
    });

    if (!exists) {
      const bloodType = bloodTypeRepository.create(bloodTypeData);
      await bloodTypeRepository.save(bloodType);
      console.log(`Tipo de sangre creado: ${bloodTypeData.bloodType}`);
    }
  }

  console.log('Seed de tipos de sangre completado');
} 