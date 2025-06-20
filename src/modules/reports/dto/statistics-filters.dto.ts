import { ReportFiltersDto } from './report-filters.dto';

export class StatisticsFiltersDto extends ReportFiltersDto {
  // Los filtros de estadísticas ahora usan la configuración del sistema para el tiempo objetivo
  // Ya no se requiere targetTime como parámetro de filtro
} 