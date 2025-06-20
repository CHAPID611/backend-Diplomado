import { MigrationInterface, QueryRunner, TableColumn } from "typeorm";

export class AddVehicleStatus1718391600010 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        // Primero crear el tipo enum
        await queryRunner.query(`
            CREATE TYPE "vehicle_status_enum" AS ENUM ('disponible', 'en_emergencia', 'en_mantenimiento')
        `);

        // Luego agregar la columna
        await queryRunner.addColumn(
            "vehicles",
            new TableColumn({
                name: "status",
                type: "enum",
                enum: ["disponible", "en_emergencia", "en_mantenimiento"],
                default: "'disponible'"
            })
        );
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Eliminar la columna
        await queryRunner.dropColumn("vehicles", "status");

        // Eliminar el tipo enum
        await queryRunner.query(`DROP TYPE "vehicle_status_enum"`);
    }
} 