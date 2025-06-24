import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddExamScheduleClassesTable1750130493614
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "exam_schedule_classes" (
        "exam_schedule_id" integer NOT NULL,
        "class_id" integer NOT NULL,
        CONSTRAINT "PK_exam_schedule_classes" PRIMARY KEY ("exam_schedule_id", "class_id"),
        CONSTRAINT "FK_exam_schedule_classes_exam_schedule" FOREIGN KEY ("exam_schedule_id") REFERENCES "exam_schedule"("id") ON DELETE CASCADE ON UPDATE NO ACTION,
        CONSTRAINT "FK_exam_schedule_classes_classes" FOREIGN KEY ("class_id") REFERENCES "classes"("id") ON DELETE CASCADE ON UPDATE NO ACTION
      )
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_exam_schedule_classes_exam_schedule_id" ON "exam_schedule_classes" ("exam_schedule_id")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_exam_schedule_classes_class_id" ON "exam_schedule_classes" ("class_id")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "IDX_exam_schedule_classes_class_id"`);
    await queryRunner.query(
      `DROP INDEX "IDX_exam_schedule_classes_exam_schedule_id"`,
    );
    await queryRunner.query(`DROP TABLE "exam_schedule_classes"`);
  }
}
