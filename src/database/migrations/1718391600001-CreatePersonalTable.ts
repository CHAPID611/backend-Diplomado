import { MigrationInterface, QueryRunner } from "typeorm";

export class CreatePersonalTable1718391600001 implements MigrationInterface {
    name = 'CreatePersonalTable1718391600001'

    public async up(queryRunner: QueryRunner): Promise<void> {
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
                \`cargo\` varchar(50) NOT NULL,
                \`rango\` varchar(50) NOT NULL,
                \`fechaIngreso\` date NOT NULL,
                \`estado\` varchar(20) NOT NULL,
                \`cualidades\` text NOT NULL,
                \`experienciaAnios\` int NOT NULL,
                \`observaciones\` text NULL,
                \`contactoEmergencia\` json NOT NULL,
                PRIMARY KEY (\`personalId\`),
                UNIQUE KEY \`REL_userId\` (\`userId\`)
            ) ENGINE=InnoDB
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP TABLE \`personal\``);
    }
} 