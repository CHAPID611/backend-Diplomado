import { MigrationInterface, QueryRunner } from "typeorm";

export class UpdateEmergencyFields1718391600000 implements MigrationInterface {
    name = 'UpdateEmergencyFields1718391600000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`emergencies\` MODIFY \`arrivalSceneTime\` datetime NULL`);
        await queryRunner.query(`ALTER TABLE \`emergencies\` MODIFY \`arrivalSceneTimeDescription\` text NULL`);
        await queryRunner.query(`ALTER TABLE \`emergencies\` MODIFY \`arrivalHospitalTime\` datetime NULL`);
        await queryRunner.query(`ALTER TABLE \`emergencies\` MODIFY \`arrivalHospitalTimeDescription\` text NULL`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`emergencies\` MODIFY \`arrivalHospitalTimeDescription\` text NOT NULL`);
        await queryRunner.query(`ALTER TABLE \`emergencies\` MODIFY \`arrivalHospitalTime\` datetime NOT NULL`);
        await queryRunner.query(`ALTER TABLE \`emergencies\` MODIFY \`arrivalSceneTimeDescription\` text NOT NULL`);
        await queryRunner.query(`ALTER TABLE \`emergencies\` MODIFY \`arrivalSceneTime\` datetime NOT NULL`);
    }
} 