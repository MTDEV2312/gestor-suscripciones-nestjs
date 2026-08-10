import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddNotificationHourToUser1784864063152 implements MigrationInterface {
  name = 'AddNotificationHourToUser1784864063152';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "user" ADD COLUMN "notificationHour" integer NOT NULL DEFAULT 20`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "user" DROP COLUMN "notificationHour"`,
    );
  }
}
