import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddMaxScoreToExams1750130493613 implements MigrationInterface {
  name = 'AddMaxScoreToExams1750130493613';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "exams" ADD "max_score" numeric(5,2) NOT NULL DEFAULT '10'`,
    );
    await queryRunner.query(
      `COMMENT ON COLUMN "exams"."max_score" IS 'Điểm tối đa của bài thi'`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "exams" DROP COLUMN "max_score"`);
  }
}
