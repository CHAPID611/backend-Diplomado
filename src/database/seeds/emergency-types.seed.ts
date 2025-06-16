import { DataSource } from 'typeorm';
import { EmergencyType } from '../../modules/emergencies/entities/emergency-type.entity';

export const emergencyTypesSeed = async (dataSource: DataSource) => {
  const emergencyTypeRepository = dataSource.getRepository(EmergencyType);

  const emergencyTypes = [
    { emergencyType: 'Accidente Aereo' },
    { emergencyType: 'Accidente de Transito' },
    { emergencyType: 'Accidente Fluvial' },
    { emergencyType: 'Accidente Maritimo' },
    { emergencyType: 'Accidente Minero' },
    { emergencyType: 'Actividades de Prevencion - Covid 19 Lavado y Desinfección' },
    { emergencyType: 'Actividades De Prevención: Monitoreo de Fuentes Hidricas' },
    { emergencyType: 'Apoyo Operativo' },
    { emergencyType: 'Apoyo Operativo - Covid 19 Distribución De Agua Potable' },
    { emergencyType: 'Atención Prehospitalaria' },
    { emergencyType: 'Atención Prehospitalaria - Covid 19' },
    { emergencyType: 'Avenida Torrencial' },
    { emergencyType: 'Busqueda Y Recuperacion De Cuerpo' },
    { emergencyType: 'Busqueda Y Rescate De Persona' },
    { emergencyType: 'Caida De Arbol' },
    { emergencyType: 'Capacitacion' },
    { emergencyType: 'Colapso' },
    { emergencyType: 'Control Y Recoleccion (Abejas, Avispas, Otros)' },
    { emergencyType: 'Creciente Subita' },
    { emergencyType: 'Derrame De Hidrocarburo' },
    { emergencyType: 'Desabastecimiento De Agua' },
    { emergencyType: 'Desbordamiento' },
    { emergencyType: 'Desplazamiento Sin Intervencion' },
    { emergencyType: 'Disposición De Cadaveres Covid 19' },
    { emergencyType: 'Entrega de Ayudas Humanitarias' },
    { emergencyType: 'Eventos Masivos' },
    { emergencyType: 'Explosion' },
    { emergencyType: 'Falla Electrica' },
    { emergencyType: 'Falsa Alarma' },
    { emergencyType: 'Fuga De Gas' },
    { emergencyType: 'Granizada' },
    { emergencyType: 'Incendio De Interfaz' },
    { emergencyType: 'Incendio Estructural' },
    { emergencyType: 'Incendio Forestal' },
    { emergencyType: 'Incendio Vehicular' },
    { emergencyType: 'Incendios Rellenos Sanitarios' },
    { emergencyType: 'Inspecciones De Seguridad Recorridos Y Verific' },
    { emergencyType: 'Investigacion De Incendios' },
    { emergencyType: 'Materiales Peligrosos Otros' },
    { emergencyType: 'Quemas Prohibidas' },
    { emergencyType: 'Remocion En Masa' },
    { emergencyType: 'Rescate Animal' },
    { emergencyType: 'Rescate Casos Suicida' },
    { emergencyType: 'Sequía' },
    { emergencyType: 'Servicios Especiales A La Comunidad' },
    { emergencyType: 'Sismo' },
    { emergencyType: 'Tormenta Electrica' },
    { emergencyType: 'Traslado De Paciente' },
    { emergencyType: 'Traslado De Paciente-Covid 19' },
    { emergencyType: 'Vendaval' }
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

  console.log('Seed de tipos de emergencia completado');
}; 