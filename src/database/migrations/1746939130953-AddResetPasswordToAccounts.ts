import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddResetPasswordToAccounts1747000000000
  implements MigrationInterface
{
  public async up(q: QueryRunner): Promise<void> {
    await q.addColumn('accounts', new TableColumn({
      name: 'reset_password_code',
      type: 'character varying',
      length: '6',
      isNullable: true,
    }));
    await q.addColumn('accounts', new TableColumn({
      name: 'reset_password_expires_at',
      type: 'timestamp without time zone',
      isNullable: true,
    }));
  }
  public async down(q: QueryRunner): Promise<void> {
    await q.dropColumn('accounts', 'reset_password_expires_at');
    await q.dropColumn('accounts', 'reset_password_code');
  }
}
