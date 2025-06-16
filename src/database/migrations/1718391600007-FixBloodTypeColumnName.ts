import { MigrationInterface, QueryRunner } from "typeorm";

export class FixBloodTypeColumnName1718391600007 implements MigrationInterface {
    name = 'FixBloodTypeColumnName1718391600007'

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Cambiar nombre de columna userTypeId a bloodTypeId en personal_new
        await queryRunner.query(`ALTER TABLE \`personal_new\` CHANGE \`userTypeId\` \`bloodTypeId\` int NOT NULL`);
        
        // Actualizar índice
        await queryRunner.query(`DROP INDEX \`IDX_personal_userTypeId\` ON \`personal_new\``);
        await queryRunner.query(`CREATE INDEX \`IDX_personal_bloodTypeId\` ON \`personal_new\` (\`bloodTypeId\`)`);
        
        // Actualizar clave foránea
        await queryRunner.query(`ALTER TABLE \`personal_new\` DROP FOREIGN KEY \`FK_personal_new_userTypeId\``);
        await queryRunner.query(`ALTER TABLE \`personal_new\` ADD CONSTRAINT \`FK_personal_new_bloodTypeId\` FOREIGN KEY (\`bloodTypeId\`) REFERENCES \`bloodType\`(\`bloodTypeId\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Revertir cambios
        await queryRunner.query(`ALTER TABLE \`personal_new\` DROP FOREIGN KEY \`FK_personal_new_bloodTypeId\``);
        await queryRunner.query(`DROP INDEX \`IDX_personal_bloodTypeId\` ON \`personal_new\``);
        await queryRunner.query(`ALTER TABLE \`personal_new\` CHANGE \`bloodTypeId\` \`userTypeId\` int NOT NULL`);
        await queryRunner.query(`CREATE INDEX \`IDX_personal_userTypeId\` ON \`personal_new\` (\`userTypeId\`)`);
        await queryRunner.query(`ALTER TABLE \`personal_new\` ADD CONSTRAINT \`FK_personal_new_userTypeId\` FOREIGN KEY (\`userTypeId\`) REFERENCES \`bloodType\`(\`bloodTypeId\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }
} 