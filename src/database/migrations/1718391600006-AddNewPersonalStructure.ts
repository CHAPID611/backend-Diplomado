import { MigrationInterface, QueryRunner } from "typeorm";

export class AddNewPersonalStructure1718391600006 implements MigrationInterface {
    name = 'AddNewPersonalStructure1718391600006'

    public async up(queryRunner: QueryRunner): Promise<void> {
        // 1. Crear tabla bloodType
        await queryRunner.query(`
            CREATE TABLE IF NOT EXISTS \`bloodType\` (
                \`bloodTypeId\` int NOT NULL AUTO_INCREMENT,
                \`bloodType\` varchar(10) NOT NULL,
                PRIMARY KEY (\`bloodTypeId\`)
            ) ENGINE=InnoDB
        `);

        // 2. Crear tabla states
        await queryRunner.query(`
            CREATE TABLE IF NOT EXISTS \`states\` (
                \`stateId\` int NOT NULL AUTO_INCREMENT,
                \`state\` varchar(50) NOT NULL,
                PRIMARY KEY (\`stateId\`)
            ) ENGINE=InnoDB
        `);

        // 3. Crear tabla ranges
        await queryRunner.query(`
            CREATE TABLE IF NOT EXISTS \`ranges\` (
                \`rangeId\` int NOT NULL AUTO_INCREMENT,
                \`range\` varchar(50) NOT NULL,
                PRIMARY KEY (\`rangeId\`)
            ) ENGINE=InnoDB
        `);

        // 4. Crear tabla employmentData
        await queryRunner.query(`
            CREATE TABLE IF NOT EXISTS \`employmentData\` (
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

        // 5. Crear tabla competencias
        await queryRunner.query(`
            CREATE TABLE IF NOT EXISTS \`competencias\` (
                \`competenciaId\` int NOT NULL AUTO_INCREMENT,
                \`name\` varchar(50) NOT NULL,
                \`category\` varchar(50) NOT NULL,
                PRIMARY KEY (\`competenciaId\`)
            ) ENGINE=InnoDB
        `);

        // 6. Crear tabla peopleCompetencias
        await queryRunner.query(`
            CREATE TABLE IF NOT EXISTS \`peopleCompetencias\` (
                \`personalId\` int NOT NULL,
                \`competenciaId\` int NOT NULL,
                PRIMARY KEY (\`personalId\`, \`competenciaId\`),
                INDEX \`IDX_peopleCompetencias_personalId\` (\`personalId\`),
                INDEX \`IDX_peopleCompetencias_competenciaId\` (\`competenciaId\`)
            ) ENGINE=InnoDB
        `);

        // 7. Crear nueva tabla emergencyContact
        await queryRunner.query(`
            CREATE TABLE IF NOT EXISTS \`emergencyContact\` (
                \`emergencyContactId\` int NOT NULL AUTO_INCREMENT,
                \`name\` varchar(100) NOT NULL,
                \`relationship\` varchar(50) NOT NULL,
                \`mobilePhone\` varchar(15) NOT NULL,
                PRIMARY KEY (\`emergencyContactId\`)
            ) ENGINE=InnoDB
        `);

        // 8. Crear nueva tabla personal con estructura del diagrama
        await queryRunner.query(`
            CREATE TABLE IF NOT EXISTS \`personal_new\` (
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

        // 9. Agregar claves foráneas
        try {
            await queryRunner.query(`ALTER TABLE \`employmentData\` ADD CONSTRAINT \`FK_employmentData_rangeId\` FOREIGN KEY (\`rangeId\`) REFERENCES \`ranges\`(\`rangeId\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        } catch (e) {
            console.log('FK employmentData_rangeId ya existe');
        }

        try {
            await queryRunner.query(`ALTER TABLE \`employmentData\` ADD CONSTRAINT \`FK_employmentData_stateId\` FOREIGN KEY (\`stateId\`) REFERENCES \`states\`(\`stateId\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        } catch (e) {
            console.log('FK employmentData_stateId ya existe');
        }

        try {
            await queryRunner.query(`ALTER TABLE \`personal_new\` ADD CONSTRAINT \`FK_personal_new_userId\` FOREIGN KEY (\`userId\`) REFERENCES \`users\`(\`userId\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        } catch (e) {
            console.log('FK personal_new_userId ya existe');
        }

        try {
            await queryRunner.query(`ALTER TABLE \`personal_new\` ADD CONSTRAINT \`FK_personal_new_userTypeId\` FOREIGN KEY (\`userTypeId\`) REFERENCES \`bloodType\`(\`bloodTypeId\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        } catch (e) {
            console.log('FK personal_new_userTypeId ya existe');
        }

        try {
            await queryRunner.query(`ALTER TABLE \`personal_new\` ADD CONSTRAINT \`FK_personal_new_employmentDataId\` FOREIGN KEY (\`employmentDataId\`) REFERENCES \`employmentData\`(\`employmentDataId\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        } catch (e) {
            console.log('FK personal_new_employmentDataId ya existe');
        }

        try {
            await queryRunner.query(`ALTER TABLE \`personal_new\` ADD CONSTRAINT \`FK_personal_new_emergencyContactId\` FOREIGN KEY (\`emergencyContactId\`) REFERENCES \`emergencyContact\`(\`emergencyContactId\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        } catch (e) {
            console.log('FK personal_new_emergencyContactId ya existe');
        }

        try {
            await queryRunner.query(`ALTER TABLE \`peopleCompetencias\` ADD CONSTRAINT \`FK_peopleCompetencias_personalId\` FOREIGN KEY (\`personalId\`) REFERENCES \`personal_new\`(\`personalId\`) ON DELETE CASCADE ON UPDATE NO ACTION`);
        } catch (e) {
            console.log('FK peopleCompetencias_personalId ya existe');
        }

        try {
            await queryRunner.query(`ALTER TABLE \`peopleCompetencias\` ADD CONSTRAINT \`FK_peopleCompetencias_competenciaId\` FOREIGN KEY (\`competenciaId\`) REFERENCES \`competencias\`(\`competenciaId\`) ON DELETE CASCADE ON UPDATE NO ACTION`);
        } catch (e) {
            console.log('FK peopleCompetencias_competenciaId ya existe');
        }
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Revertir cambios
        await queryRunner.query(`DROP TABLE IF EXISTS \`peopleCompetencias\``);
        await queryRunner.query(`DROP TABLE IF EXISTS \`personal_new\``);
        await queryRunner.query(`DROP TABLE IF EXISTS \`emergencyContact\``);
        await queryRunner.query(`DROP TABLE IF EXISTS \`competencias\``);
        await queryRunner.query(`DROP TABLE IF EXISTS \`employmentData\``);
        await queryRunner.query(`DROP TABLE IF EXISTS \`ranges\``);
        await queryRunner.query(`DROP TABLE IF EXISTS \`states\``);
        await queryRunner.query(`DROP TABLE IF EXISTS \`bloodType\``);
    }
} 