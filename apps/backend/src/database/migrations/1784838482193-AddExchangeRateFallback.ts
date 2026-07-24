import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddExchangeRateFallback1784838482193 implements MigrationInterface {
  name = 'AddExchangeRateFallback1784838482193';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "exchange_rate_fallback" ("id" varchar PRIMARY KEY NOT NULL, "base_currency" varchar(10) NOT NULL, "target_currency" varchar(10) NOT NULL, "rate" decimal(12,6) NOT NULL, "updated_at" datetime NOT NULL DEFAULT (datetime('now')))`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "exchange_rate_fallback"`);
  }
}
