import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class UpdateBlacklistToken1746244705670 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.addColumns('blacklist_tokens', [
      new TableColumn({
        name: 'expiredAt',
        type: 'timestamp',
      }),
      new TableColumn({
        name: 'createdAt',
        type: 'timestamp',
        default: 'CURRENT_TIMESTAMP',
      }),
    ]);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropColumn('blacklist_tokens', 'expiredAt');
    await queryRunner.dropColumn('blacklist_tokens', 'createdAt');
  }
}
