import { MigrationInterface, QueryRunner } from "typeorm";

export class RefactorPersonalToDiagram1718391600005 implements MigrationInterface {
    name = 'RefactorPersonalToDiagram1718391600005'

    public async up(queryRunner: QueryRunner): Promise<void> {
        // 1. Crear tabla bloodType
        await queryRunner.query(`
            CREATE TABLE \`bloodType\` (
                \`bloodTypeId\` int NOT NULL AUTO_INCREMENT,
                \`bloodType\` varchar(10) NOT NULL,
                PRIMARY KEY (\`bloodTypeId\`)
            ) ENGINE=InnoDB
        `);

        // 2. Crear tabla states
        await queryRunner.query(`
            CREATE TABLE \`states\` (
                \`stateId\` int NOT NULL AUTO_INCREMENT,
                \`state\` varchar(50) NOT NULL,
                PRIMARY KEY (\`stateId\`)
            ) ENGINE=InnoDB
        `);

        // 3. Crear tabla ranges
        await queryRunner.query(`
            CREATE TABLE \`ranges\` (
                \`rangeId\` int NOT NULL AUTO_INCREMENT,
                \`range\` varchar(50) NOT NULL,
                PRIMARY KEY (\`rangeId\`)
            ) ENGINE=InnoDB
        `);

        // 4. Crear tabla employmentData
        await queryRunner.query(`
            CREATE TABLE \`employmentData\` (
                \`employmentDataId\` int NOT NULL AUTO_INCREMENT,
                \`rangeId\` int NOT NULL,
                \`stateId\` int NOT NULL,
                \`admissionDate\` date NOT NULL,
                \`yearsOfExperience\` int NOT NULL,
                \`observations\` varchar(500) NULL,
                PRIMARY KEY (\`employmentDataId\`),
                INDEX \`IDX_employmentData_rangeId\` (\`rangeId\`),
                INDEX \`IDX_employmentData_stateId\` (\`stateId\`)
            ) ENGINE=InnoDB
        `);

        // 5. Crear tabla competencias (renombrar de cualidades)
        await queryRunner.query(`
            CREATE TABLE \`competencias\` (
                \`competenciaId\` int NOT NULL AUTO_INCREMENT,
                \`name\` varchar(50) NOT NULL,
                \`category\` varchar(50) NOT NULL,
                PRIMARY KEY (\`competenciaId\`)
            ) ENGINE=InnoDB
        `);

        // 6. Renombrar tabla contactos_emergencia a emergencyContact
        await queryRunner.query(`RENAME TABLE \`contactos_emergencia\` TO \`emergencyContact\``);

        // 7. Modificar estructura de emergencyContact
        await queryRunner.query(`ALTER TABLE \`emergencyContact\` CHANGE \`contactoId\` \`emergencyContactId\` int NOT NULL AUTO_INCREMENT`);
        await queryRunner.query(`ALTER TABLE \`emergencyContact\` CHANGE \`nombre\` \`name\` varchar(100) NOT NULL`);
        await queryRunner.query(`ALTER TABLE \`emergencyContact\` CHANGE \`parentesco\` \`relationship\` varchar(50) NOT NULL`);
        await queryRunner.query(`ALTER TABLE \`emergencyContact\` CHANGE \`telefono\` \`mobilePhone\` varchar(15) NOT NULL`);
        await queryRunner.query(`ALTER TABLE \`emergencyContact\` DROP COLUMN \`personalId\``);

        // 8. Crear tabla peopleCompetencias (nueva tabla intermedia)
        await queryRunner.query(`
            CREATE TABLE \`peopleCompetencias\` (
                \`personalId\` int NOT NULL,
                \`competenciaId\` int NOT NULL,
                PRIMARY KEY (\`personalId\`, \`competenciaId\`),
                INDEX \`IDX_peopleCompetencias_personalId\` (\`personalId\`),
                INDEX \`IDX_peopleCompetencias_competenciaId\` (\`competenciaId\`)
            ) ENGINE=InnoDB
        `);

        // 9. Backup de datos de personal
        await queryRunner.query(`
            CREATE TABLE \`personal_backup\` AS SELECT * FROM \`personal\`
        `);

        // 10. Modificar estructura de tabla personal
        await queryRunner.query(`DROP TABLE \`personal\``);
        await queryRunner.query(`
            CREATE TABLE \`personal\` (
                \`personalId\` int NOT NULL AUTO_INCREMENT,
                \`userId\` int NOT NULL,
                \`userTypeId\` int NOT NULL,
                \`employmentDataId\` int NOT NULL,
                \`emergencyContactId\` int NOT NULL,
                \`firstName\` varchar(50) NOT NULL,
                \`secondName\` varchar(50) NULL,
                \`firstLastName\` varchar(50) NOT NULL,
                \`secondLastName\` varchar(50) NULL,
                \`idNumber\` varchar(20) NOT NULL,
                \`birthDate\` date NOT NULL,
                \`address\` varchar(200) NOT NULL,
                \`phoneNumber\` varchar(15) NOT NULL,
                PRIMARY KEY (\`personalId\`),
                UNIQUE INDEX \`REL_personal_userId\` (\`userId\`),
                UNIQUE INDEX \`REL_personal_emergencyContactId\` (\`emergencyContactId\`),
                INDEX \`IDX_personal_userTypeId\` (\`userTypeId\`),
                INDEX \`IDX_personal_employmentDataId\` (\`employmentDataId\`)
            ) ENGINE=InnoDB
        `);

        // 11. Agregar claves foráneas
        await queryRunner.query(`ALTER TABLE \`employmentData\` ADD CONSTRAINT \`FK_employmentData_rangeId\` FOREIGN KEY (\`rangeId\`) REFERENCES \`ranges\`(\`rangeId\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`employmentData\` ADD CONSTRAINT \`FK_employmentData_stateId\` FOREIGN KEY (\`stateId\`) REFERENCES \`states\`(\`stateId\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`personal\` ADD CONSTRAINT \`FK_personal_userId\` FOREIGN KEY (\`userId\`) REFERENCES \`users\`(\`userId\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`personal\` ADD CONSTRAINT \`FK_personal_userTypeId\` FOREIGN KEY (\`userTypeId\`) REFERENCES \`bloodType\`(\`bloodTypeId\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`personal\` ADD CONSTRAINT \`FK_personal_employmentDataId\` FOREIGN KEY (\`employmentDataId\`) REFERENCES \`employmentData\`(\`employmentDataId\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`personal\` ADD CONSTRAINT \`FK_personal_emergencyContactId\` FOREIGN KEY (\`emergencyContactId\`) REFERENCES \`emergencyContact\`(\`emergencyContactId\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`peopleCompetencias\` ADD CONSTRAINT \`FK_peopleCompetencias_personalId\` FOREIGN KEY (\`personalId\`) REFERENCES \`personal\`(\`personalId\`) ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`peopleCompetencias\` ADD CONSTRAINT \`FK_peopleCompetencias_competenciaId\` FOREIGN KEY (\`competenciaId\`) REFERENCES \`competencias\`(\`competenciaId\`) ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Revertir cambios en orden inverso
        await queryRunner.query(`ALTER TABLE \`peopleCompetencias\` DROP FOREIGN KEY \`FK_peopleCompetencias_competenciaId\``);
        await queryRunner.query(`ALTER TABLE \`peopleCompetencias\` DROP FOREIGN KEY \`FK_peopleCompetencias_personalId\``);
        await queryRunner.query(`ALTER TABLE \`personal\` DROP FOREIGN KEY \`FK_personal_emergencyContactId\``);
        await queryRunner.query(`ALTER TABLE \`personal\` DROP FOREIGN KEY \`FK_personal_employmentDataId\``);
        await queryRunner.query(`ALTER TABLE \`personal\` DROP FOREIGN KEY \`FK_personal_userTypeId\``);
        await queryRunner.query(`ALTER TABLE \`personal\` DROP FOREIGN KEY \`FK_personal_userId\``);
        await queryRunner.query(`ALTER TABLE \`employmentData\` DROP FOREIGN KEY \`FK_employmentData_stateId\``);
        await queryRunner.query(`ALTER TABLE \`employmentData\` DROP FOREIGN KEY \`FK_employmentData_rangeId\``);
        
        await queryRunner.query(`DROP TABLE \`peopleCompetencias\``);
        await queryRunner.query(`DROP TABLE \`personal\``);
        await queryRunner.query(`RENAME TABLE \`personal_backup\` TO \`personal\``);
        await queryRunner.query(`RENAME TABLE \`emergencyContact\` TO \`contactos_emergencia\``);
        await queryRunner.query(`DROP TABLE \`competencias\``);
        await queryRunner.query(`DROP TABLE \`employmentData\``);
        await queryRunner.query(`DROP TABLE \`ranges\``);
        await queryRunner.query(`DROP TABLE \`states\``);
        await queryRunner.query(`DROP TABLE \`bloodType\``);
    }
} 