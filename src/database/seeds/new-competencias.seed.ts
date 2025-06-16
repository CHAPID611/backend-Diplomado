import { DataSource } from 'typeorm';
import { Competencias } from '../../modules/personal/entities/competencias.entity';

export async function seedCompetencias(dataSource: DataSource): Promise<void> {
  const competenciasRepository = dataSource.getRepository(Competencias);

  const competencias = [
    // Competencias médicas
    { name: 'Primeros Auxilios', category: 'medica' },
    { name: 'Paramedicina', category: 'medica' },
    { name: 'Soporte Vital Básico', category: 'medica' },
    { name: 'Soporte Vital Avanzado', category: 'medica' },

    // Competencias de rescate
    { name: 'Rescate Acuático', category: 'rescate' },
    { name: 'Rescate en Altura', category: 'rescate' },
    { name: 'Rescate Vehicular', category: 'rescate' },
    { name: 'Rescate en Espacios Confinados', category: 'rescate' },

    // Competencias técnicas
    { name: 'Manejo de Materiales Peligrosos', category: 'tecnica' },
    { name: 'Operación de Equipos Hidráulicos', category: 'tecnica' },
    { name: 'Soldadura y Corte', category: 'tecnica' },
    { name: 'Mantenimiento de Equipos', category: 'tecnica' },

    // Competencias operativas
    { name: 'Combate de Incendios Estructurales', category: 'operativa' },
    { name: 'Combate de Incendios Forestales', category: 'operativa' },
    { name: 'Ventilación Táctica', category: 'operativa' },
    { name: 'Búsqueda y Rescate Urbano', category: 'operativa' },

    // Competencias administrativas
    { name: 'Liderazgo de Equipos', category: 'administrativa' },
    { name: 'Gestión de Emergencias', category: 'administrativa' },
    { name: 'Capacitación y Entrenamiento', category: 'administrativa' },
    { name: 'Planificación Operativa', category: 'administrativa' }
  ];

  for (const competenciaData of competencias) {
    const exists = await competenciasRepository.findOne({
      where: { 
        name: competenciaData.name,
        category: competenciaData.category 
      }
    });

    if (!exists) {
      const competencia = competenciasRepository.create(competenciaData);
      await competenciasRepository.save(competencia);
      console.log(`Competencia creada: ${competenciaData.name} (${competenciaData.category})`);
    }
  }

  console.log('Seed de competencias completado');
} 