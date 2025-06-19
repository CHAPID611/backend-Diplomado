import { DataSource } from 'typeorm';
import { States } from '../../modules/personal/entities/states.entity';

export async function seedStates(dataSource: DataSource): Promise<void> {
  const statesRepository = dataSource.getRepository(States);

  const states = [
    { state: 'activo' },
    { state: 'en licencia' }
  ];

  for (const stateData of states) {
    const exists = await statesRepository.findOne({
      where: { state: stateData.state }
    });

    if (!exists) {
      const state = statesRepository.create(stateData);
      await statesRepository.save(state);
      console.log(`Estado creado: ${stateData.state}`);
    }
  }

  console.log('Seed de estados completado');
} 