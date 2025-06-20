import { MigrationInterface, QueryRunner, Table } from 'typeorm';

export class CreateEmergencyPersonnelTable1718391600012 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(new Table({
      name: 'emergency_personnel',
      columns: [
        {
          name: 'emergencyId',
          type: 'int',
          isPrimary: true,
        },
        {
          name: 'personalId',
          type: 'int',
          isPrimary: true,
        },
      ],
      foreignKeys: [
        {
          columnNames: ['emergencyId'],
          referencedTableName: 'emergencies',
          referencedColumnNames: ['emergencyId'],
          onDelete: 'CASCADE',
        },
        {
          columnNames: ['personalId'],
          referencedTableName: 'personal_new',
          referencedColumnNames: ['personalId'],
          onDelete: 'CASCADE',
        },
      ],
      indices: [
        {
          name: 'IDX_emergency_personnel_emergency',
          columnNames: ['emergencyId'],
        },
        {
          name: 'IDX_emergency_personnel_personal',
          columnNames: ['personalId'],
        },
      ],
    }), true);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('emergency_personnel');
  }
} 