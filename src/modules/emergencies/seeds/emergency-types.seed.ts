import { DataSource } from 'typeorm';
import { EmergencyType } from '../entities/emergency-type.entity';

export const emergencyTypesSeed = async (dataSource: DataSource) => {
  const emergencyTypeRepository = dataSource.getRepository(EmergencyType);

  const emergencyTypes = [
    { emergencyType: 'Incendio Estructural' },
    { emergencyType: 'Rescate Vehicular' },
    { emergencyType: 'Emergencia Médica' },
    { emergencyType: 'Materiales Peligrosos' },
    { emergencyType: 'Inundación' },
    { emergencyType: 'Rescate en Altura' },
    { emergencyType: 'Accidente de Tránsito' },
    { emergencyType: 'Fuga de Gas' },
    { emergencyType: 'Colapso Estructural' },
    { emergencyType: 'Emergencia Química' }
  ];

  for (const type of emergencyTypes) {
    const existingType = await emergencyTypeRepository.findOne({
      where: { emergencyType: type.emergencyType }
    });

    if (!existingType) {
      const emergencyType = emergencyTypeRepository.create(type);
      await emergencyTypeRepository.save(emergencyType);
      console.log(`Tipo de emergencia creado: ${type.emergencyType}`);
    }
  }
}; 