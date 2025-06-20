import { MigrationInterface, QueryRunner, Table, TableForeignKey, TableColumn } from "typeorm";

export class CreateEmergencyVehiclesTable1718391600011 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        // Crear tabla de relación entre emergencias y vehículos
        await queryRunner.createTable(new Table({
            name: "emergency_vehicles",
            columns: [
                {
                    name: "emergencyId",
                    type: "int",
                    isPrimary: true
                },
                {
                    name: "vehicleId",
                    type: "int",
                    isPrimary: true
                }
            ]
        }), true);

        // Agregar foreign keys
        await queryRunner.createForeignKey("emergency_vehicles", new TableForeignKey({
            columnNames: ["emergencyId"],
            referencedColumnNames: ["emergencyId"],
            referencedTableName: "emergencies",
            onDelete: "CASCADE"
        }));

        await queryRunner.createForeignKey("emergency_vehicles", new TableForeignKey({
            columnNames: ["vehicleId"],
            referencedColumnNames: ["vehicleId"],
            referencedTableName: "vehicles",
            onDelete: "CASCADE"
        }));

        // Eliminar la columna vehicleId de la tabla emergencies ya que ahora usaremos la tabla de relación
        await queryRunner.dropColumn("emergencies", "vehicleId");
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Agregar de nuevo la columna vehicleId a la tabla emergencies
        await queryRunner.addColumn("emergencies", new TableColumn({
            name: "vehicleId",
            type: "int",
            isNullable: true
        }));

        // Eliminar la tabla de relación
        await queryRunner.dropTable("emergency_vehicles");
    }
} 