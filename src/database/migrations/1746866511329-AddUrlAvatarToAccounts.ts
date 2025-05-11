import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddUrlAvatarToAccounts1683756000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.addColumn(
      'accounts',
      new TableColumn({
        name: 'url_avatar',
        type: 'character varying',
        length: '255',
        isNullable: true,
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropColumn('accounts', 'url_avatar');
  }
}
