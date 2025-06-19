import { MigrationInterface, QueryRunner, TableColumn } from "typeorm";

export class AddEmailToPersonal1718391600008 implements MigrationInterface {
    name = 'AddEmailToPersonal1718391600008'

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Agregar columna email a la tabla personal_new
        await queryRunner.addColumn("personal_new", new TableColumn({
            name: "email",
            type: "varchar",
            length: "100",
            isNullable: false,
            default: "'sin.email@ejemplo.com'" // Valor por defecto para registros existentes
        }));
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Eliminar columna email de la tabla personal_new
        await queryRunner.dropColumn("personal_new", "email");
    }
} 