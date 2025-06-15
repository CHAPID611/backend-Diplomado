import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddEmergencyDescriptions implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE emergencies
      ADD COLUMN reportTimeDescription TEXT NOT NULL,
      ADD COLUMN departureTimeDescription TEXT NOT NULL,
      ADD COLUMN arrivalSceneTimeDescription TEXT NOT NULL,
      ADD COLUMN arrivalHospitalTimeDescription TEXT NOT NULL,
      ADD COLUMN returnEstationTimeDescription TEXT NOT NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE emergencies
      DROP COLUMN reportTimeDescription,
      DROP COLUMN departureTimeDescription,
      DROP COLUMN arrivalSceneTimeDescription,
      DROP COLUMN arrivalHospitalTimeDescription,
      DROP COLUMN returnEstationTimeDescription
    `);
  }
} 