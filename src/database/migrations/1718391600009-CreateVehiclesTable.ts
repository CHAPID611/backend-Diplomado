import { MigrationInterface, QueryRunner, Table, TableColumn, TableForeignKey } from "typeorm";

export class CreateVehiclesTable1718391600009 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        // Crear tabla de vehículos
        await queryRunner.createTable(new Table({
            name: "vehicles",
            columns: [
                {
                    name: "vehicleId",
                    type: "int",
                    isPrimary: true,
                    isGenerated: true,
                    generationStrategy: "increment"
                },
                {
                    name: "name",
                    type: "varchar",
                    length: "100",
                    isNullable: false
                },
                {
                    name: "plate",
                    type: "varchar",
                    length: "20",
                    isNullable: false,
                    isUnique: true
                },
                {
                    name: "createdAt",
                    type: "timestamp",
                    default: "CURRENT_TIMESTAMP"
                },
                {
                    name: "updatedAt",
                    type: "timestamp",
                    default: "CURRENT_TIMESTAMP",
                    onUpdate: "CURRENT_TIMESTAMP"
                }
            ]
        }), true);

        // Modificar la tabla de emergencias
        await queryRunner.dropColumn("emergencies", "vehicle");
        
        await queryRunner.addColumn("emergencies", new TableColumn({
            name: "vehicleId",
            type: "int",
            isNullable: true
        }));

        await queryRunner.createForeignKey("emergencies", new TableForeignKey({
            columnNames: ["vehicleId"],
            referencedColumnNames: ["vehicleId"],
            referencedTableName: "vehicles",
            onDelete: "SET NULL"
        }));
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Revertir los cambios en la tabla de emergencias
        await queryRunner.dropForeignKey("emergencies", "FK_emergencies_vehicleId");
        await queryRunner.dropColumn("emergencies", "vehicleId");
        
        await queryRunner.addColumn("emergencies", new TableColumn({
            name: "vehicle",
            type: "varchar",
            length: "50"
        }));

        // Eliminar la tabla de vehículos
        await queryRunner.dropTable("vehicles");
    }
} 