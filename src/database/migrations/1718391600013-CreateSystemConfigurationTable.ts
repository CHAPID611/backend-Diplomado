import { MigrationInterface, QueryRunner, Table, TableIndex } from 'typeorm';

export class CreateSystemConfigurationTable1718391600013 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'system_configurations',
        columns: [
          {
            name: 'id',
            type: 'int',
            isPrimary: true,
            isGenerated: true,
            generationStrategy: 'increment',
          },
          {
            name: 'key',
            type: 'varchar',
            length: '255',
            isUnique: true,
          },
          {
            name: 'value',
            type: 'text',
          },
          {
            name: 'description',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'category',
            type: 'varchar',
            length: '100',
            default: "'system'",
          },
          {
            name: 'createdAt',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
          },
          {
            name: 'updatedAt',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
            onUpdate: 'CURRENT_TIMESTAMP',
          },
        ],
      }),
      true,
    );

    // Crear índice en la columna key para mejorar rendimiento
    await queryRunner.createIndex(
      'system_configurations',
      new TableIndex({
        name: 'IDX_system_configurations_key',
        columnNames: ['key'],
      }),
    );

    // Crear índice en la columna category
    await queryRunner.createIndex(
      'system_configurations',
      new TableIndex({
        name: 'IDX_system_configurations_category',
        columnNames: ['category'],
      }),
    );

    // Insertar configuración por defecto para el tiempo objetivo
    await queryRunner.query(`
      INSERT INTO system_configurations (key, value, description, category)
      VALUES ('target_response_time', '15', 'Tiempo objetivo de respuesta en minutos para emergencias', 'response_times')
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('system_configurations');
  }
} 