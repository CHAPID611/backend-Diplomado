import { MigrationInterface, QueryRunner } from "typeorm";

export class CreatePersonalTables1718391600002 implements MigrationInterface {
    name = 'CreatePersonalTables1718391600002'

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Tabla cargos
        await queryRunner.query(`
            CREATE TABLE \`cargos\` (
                \`cargoId\` int NOT NULL AUTO_INCREMENT,
                \`nombre\` varchar(50) NOT NULL,
                \`descripcion\` text NULL,
                \`nivel\` int NOT NULL,
                PRIMARY KEY (\`cargoId\`)
            ) ENGINE=InnoDB
        `);

        // Tabla cualidades
        await queryRunner.query(`
            CREATE TABLE \`cualidades\` (
                \`cualidadId\` int NOT NULL AUTO_INCREMENT,
                \`nombre\` varchar(50) NOT NULL,
                \`descripcion\` text NULL,
                PRIMARY KEY (\`cualidadId\`)
            ) ENGINE=InnoDB
        `);

        // Tabla personal (modificada)
        await queryRunner.query(`
            CREATE TABLE \`personal\` (
                \`personalId\` int NOT NULL AUTO_INCREMENT,
                \`userId\` int NOT NULL,
                \`cedula\` varchar(20) NOT NULL,
                \`nombres\` varchar(50) NOT NULL,
                \`apellidos\` varchar(50) NOT NULL,
                \`fechaNacimiento\` date NOT NULL,
                \`telefono\` varchar(15) NOT NULL,
                \`email\` varchar(100) NOT NULL,
                \`direccion\` varchar(200) NOT NULL,
                \`tipoSangre\` varchar(5) NOT NULL,
                \`estado\` varchar(20) NOT NULL,
                PRIMARY KEY (\`personalId\`),
                UNIQUE KEY \`REL_userId\` (\`userId\`),
                CONSTRAINT \`FK_personal_user\` FOREIGN KEY (\`userId\`) REFERENCES \`users\` (\`id\`) ON DELETE CASCADE
            ) ENGINE=InnoDB
        `);

        // Tabla personal_cargos
        await queryRunner.query(`
            CREATE TABLE \`personal_cargos\` (
                \`personalCargoId\` int NOT NULL AUTO_INCREMENT,
                \`personalId\` int NOT NULL,
                \`cargoId\` int NOT NULL,
                \`rango\` varchar(50) NOT NULL,
                \`fechaIngreso\` date NOT NULL,
                \`experienciaAnios\` int NOT NULL,
                PRIMARY KEY (\`personalCargoId\`),
                CONSTRAINT \`FK_personal_cargos_personal\` FOREIGN KEY (\`personalId\`) REFERENCES \`personal\` (\`personalId\`) ON DELETE CASCADE,
                CONSTRAINT \`FK_personal_cargos_cargo\` FOREIGN KEY (\`cargoId\`) REFERENCES \`cargos\` (\`cargoId\`) ON DELETE CASCADE
            ) ENGINE=InnoDB
        `);

        // Tabla personal_cualidades
        await queryRunner.query(`
            CREATE TABLE \`personal_cualidades\` (
                \`personalCualidadId\` int NOT NULL AUTO_INCREMENT,
                \`personalId\` int NOT NULL,
                \`cualidadId\` int NOT NULL,
                PRIMARY KEY (\`personalCualidadId\`),
                CONSTRAINT \`FK_personal_cualidades_personal\` FOREIGN KEY (\`personalId\`) REFERENCES \`personal\` (\`personalId\`) ON DELETE CASCADE,
                CONSTRAINT \`FK_personal_cualidades_cualidad\` FOREIGN KEY (\`cualidadId\`) REFERENCES \`cualidades\` (\`cualidadId\`) ON DELETE CASCADE
            ) ENGINE=InnoDB
        `);

        // Tabla contactos_emergencia
        await queryRunner.query(`
            CREATE TABLE \`contactos_emergencia\` (
                \`contactoId\` int NOT NULL AUTO_INCREMENT,
                \`personalId\` int NOT NULL,
                \`nombre\` varchar(100) NOT NULL,
                \`parentesco\` varchar(50) NOT NULL,
                \`telefono\` varchar(15) NOT NULL,
                PRIMARY KEY (\`contactoId\`),
                CONSTRAINT \`FK_contactos_emergencia_personal\` FOREIGN KEY (\`personalId\`) REFERENCES \`personal\` (\`personalId\`) ON DELETE CASCADE
            ) ENGINE=InnoDB
        `);

        // Tabla observaciones_personal
        await queryRunner.query(`
            CREATE TABLE \`observaciones_personal\` (
                \`observacionId\` int NOT NULL AUTO_INCREMENT,
                \`personalId\` int NOT NULL,
                \`observacion\` text NOT NULL,
                \`fecha\` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
                PRIMARY KEY (\`observacionId\`),
                CONSTRAINT \`FK_observaciones_personal_personal\` FOREIGN KEY (\`personalId\`) REFERENCES \`personal\` (\`personalId\`) ON DELETE CASCADE
            ) ENGINE=InnoDB
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP TABLE \`observaciones_personal\``);
        await queryRunner.query(`DROP TABLE \`contactos_emergencia\``);
        await queryRunner.query(`DROP TABLE \`personal_cualidades\``);
        await queryRunner.query(`DROP TABLE \`personal_cargos\``);
        await queryRunner.query(`DROP TABLE \`personal\``);
        await queryRunner.query(`DROP TABLE \`cualidades\``);
        await queryRunner.query(`DROP TABLE \`cargos\``);
    }
} 