import { DataSource } from 'typeorm';
import { Ranges } from '../../modules/personal/entities/ranges.entity';

export async function seedRanges(dataSource: DataSource): Promise<void> {
  const rangesRepository = dataSource.getRepository(Ranges);

  const ranges = [
    { range: 'Bombero' },
    { range: 'Cabo' },
    { range: 'Sargento' },
    { range: 'Subteniente' },
    { range: 'Teniente' },
    { range: 'Capitán' }
  ];

  for (const rangeData of ranges) {
    const exists = await rangesRepository.findOne({
      where: { range: rangeData.range }
    });

    if (!exists) {
      const range = rangesRepository.create(rangeData);
      await rangesRepository.save(range);
      console.log(`Rango creado: ${rangeData.range}`);
    }
  }

  console.log('Seed de rangos completado');
} 