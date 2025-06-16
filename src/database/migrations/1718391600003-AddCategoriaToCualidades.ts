import { MigrationInterface, QueryRunner } from "typeorm";

export class AddCategoriaToCualidades1718391600003 implements MigrationInterface {
    name = 'AddCategoriaToCualidades1718391600003'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`cualidades\` ADD \`categoria\` varchar(30) NOT NULL DEFAULT 'general'`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`cualidades\` DROP COLUMN \`categoria\``);
    }
} 