import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddSubscriptionHistory1784838482192 implements MigrationInterface {
  name = 'AddSubscriptionHistory1784838482192';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "subscription_history" ("id" varchar PRIMARY KEY NOT NULL, "subscription_id" varchar(50) NOT NULL, "price" decimal(10,2) NOT NULL, "old_price" decimal(10,2), "currency" varchar(3) NOT NULL, "frequency" varchar CHECK( "frequency" IN ('MONTHLY','YEARLY') ) NOT NULL, "old_frequency" varchar CHECK( "old_frequency" IN ('MONTHLY','YEARLY') ), "effective_date" date NOT NULL, "created_at" datetime NOT NULL DEFAULT (datetime('now')), CONSTRAINT "FK_subscription_history_subscription" FOREIGN KEY ("subscription_id") REFERENCES "subscription" ("id") ON DELETE CASCADE ON UPDATE NO ACTION)`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "subscription_history"`);
  }
}
