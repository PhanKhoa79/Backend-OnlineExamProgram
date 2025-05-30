import { MigrationInterface, QueryRunner, Table, TableForeignKey } from 'typeorm';

export class CreateLoginHistoryEntity1748599707388
  implements MigrationInterface
{
  name = 'CreateLoginHistoryEntity1748599707388';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'login_history',
        columns: [
          {
            name: 'id',
            type: 'serial',
            isPrimary: true,
          },
          {
            name: 'account_id',
            type: 'integer',
            isNullable: false,
          },
          {
            name: 'login_time',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
          },
          {
            name: 'ip_address',
            type: 'varchar',
            length: '50',
          },
          {
            name: 'user_agent',
            type: 'varchar',
            length: '255',
          },
        ],
      }),
      true,
    );

    await queryRunner.createForeignKey(
      'login_history',
      new TableForeignKey({
        columnNames: ['account_id'],
        referencedColumnNames: ['id'],
        referencedTableName: 'accounts',
        onDelete: 'CASCADE',
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const table = await queryRunner.getTable('login_history');
    if (table) {
      const foreignKey = table.foreignKeys.find((fk) =>
        (fk) => (fk) => (fk) => fk.columnNames.includes('account_id'),
      );
      if (foreignKey) {
        await queryRunner.dropForeignKey('login_history', foreignKey);
      }
    }

    await queryRunner.dropTable('login_history');
  }
}
