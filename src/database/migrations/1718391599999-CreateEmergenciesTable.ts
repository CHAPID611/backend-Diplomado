import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateEmergenciesTable1718391599999 implements MigrationInterface {
    name = 'CreateEmergenciesTable1718391599999'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            CREATE TABLE \`emergencies\` (
                \`emergencyId\` int NOT NULL AUTO_INCREMENT,
                \`userId\` int NOT NULL,
                \`emergencyTypeId\` int NOT NULL,
                \`emergencyDate\` datetime NOT NULL,
                \`informant\` varchar(50) NOT NULL,
                \`vehicle\` varchar(50) NOT NULL,
                \`ubication\` varchar(50) NOT NULL,
                \`turn\` varchar(50) NOT NULL,
                \`reportTime\` datetime NOT NULL,
                \`reportTimeDescription\` text NOT NULL,
                \`departureTime\` datetime NOT NULL,
                \`departureTimeDescription\` text NOT NULL,
                \`arrivalSceneTime\` datetime NOT NULL,
                \`arrivalSceneTimeDescription\` text NOT NULL,
                \`arrivalHospitalTime\` datetime NOT NULL,
                \`arrivalHospitalTimeDescription\` text NOT NULL,
                \`returnEstationTime\` datetime NOT NULL,
                \`returnEstationTimeDescription\` text NOT NULL,
                \`unitsResponse\` varchar(50) NOT NULL,
                \`guardPersonnel\` varchar(50) NOT NULL,
                PRIMARY KEY (\`emergencyId\`)
            ) ENGINE=InnoDB
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP TABLE \`emergencies\``);
    }
} 