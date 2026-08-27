import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddSubscriptionPayments1784864063153 implements MigrationInterface {
  name = 'AddSubscriptionPayments1784864063153';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "subscription_payments" (
        "id" varchar PRIMARY KEY NOT NULL,
        "user_id" varchar(50) NOT NULL,
        "subscription_id" varchar(50),
        "subscription_name" varchar(100) NOT NULL,
        "amount" decimal(10,2) NOT NULL,
        "currency" varchar(3) NOT NULL,
        "payment_date" date NOT NULL,
        "billing_month" smallint NOT NULL,
        "billing_year" smallint NOT NULL,
        "billing_period" varchar(7) NOT NULL,
        "payment_method" varchar(50),
        "status" varchar(20) NOT NULL DEFAULT ('PAID'),
        "notes" text,
        "created_at" datetime NOT NULL DEFAULT (datetime('now')),
        "updated_at" datetime NOT NULL DEFAULT (datetime('now')),
        CONSTRAINT "FK_subscription_payments_user" FOREIGN KEY ("user_id") REFERENCES "user" ("id") ON DELETE CASCADE ON UPDATE NO ACTION,
        CONSTRAINT "FK_subscription_payments_subscription" FOREIGN KEY ("subscription_id") REFERENCES "subscription" ("id") ON DELETE SET NULL ON UPDATE NO ACTION
      )`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_payments_user_date" ON "subscription_payments" ("user_id", "payment_date")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_payments_user_period" ON "subscription_payments" ("user_id", "billing_year", "billing_month")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_payments_sub_period" ON "subscription_payments" ("subscription_id", "billing_period")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "IDX_payments_sub_period"`);
    await queryRunner.query(`DROP INDEX "IDX_payments_user_period"`);
    await queryRunner.query(`DROP INDEX "IDX_payments_user_date"`);
    await queryRunner.query(`DROP TABLE "subscription_payments"`);
  }
}
