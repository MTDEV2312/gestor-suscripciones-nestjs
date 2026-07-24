import { MigrationInterface, QueryRunner } from "typeorm";

export class AddLastFetchedAtToExchangeRateFallback1784864063151 implements MigrationInterface {
    name = 'AddLastFetchedAtToExchangeRateFallback1784864063151'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "temporary_tag" ("id" varchar PRIMARY KEY NOT NULL, "name" varchar(50) NOT NULL, "color" varchar(7) NOT NULL DEFAULT ('#6B7280'), "user_id" varchar(50) NOT NULL, "created_at" datetime NOT NULL DEFAULT (datetime('now')))`);
        await queryRunner.query(`INSERT INTO "temporary_tag"("id", "name", "color", "user_id", "created_at") SELECT "id", "name", "color", "user_id", "created_at" FROM "tag"`);
        await queryRunner.query(`DROP TABLE "tag"`);
        await queryRunner.query(`ALTER TABLE "temporary_tag" RENAME TO "tag"`);
        await queryRunner.query(`CREATE TABLE "temporary_subscription_history" ("id" varchar PRIMARY KEY NOT NULL, "subscription_id" varchar(50) NOT NULL, "price" decimal(10,2) NOT NULL, "old_price" decimal(10,2), "currency" varchar(3) NOT NULL, "frequency" varchar CHECK( "frequency" IN ('MONTHLY','YEARLY') ) NOT NULL, "old_frequency" varchar CHECK( "old_frequency" IN ('MONTHLY','YEARLY') ), "effective_date" date NOT NULL, "created_at" datetime NOT NULL DEFAULT (datetime('now')))`);
        await queryRunner.query(`INSERT INTO "temporary_subscription_history"("id", "subscription_id", "price", "old_price", "currency", "frequency", "old_frequency", "effective_date", "created_at") SELECT "id", "subscription_id", "price", "old_price", "currency", "frequency", "old_frequency", "effective_date", "created_at" FROM "subscription_history"`);
        await queryRunner.query(`DROP TABLE "subscription_history"`);
        await queryRunner.query(`ALTER TABLE "temporary_subscription_history" RENAME TO "subscription_history"`);
        await queryRunner.query(`DROP INDEX "IDX_subscription_tags_tag_id"`);
        await queryRunner.query(`DROP INDEX "IDX_subscription_tags_subscription_id"`);
        await queryRunner.query(`CREATE TABLE "temporary_subscription_tags" ("subscription_id" varchar NOT NULL, "tag_id" varchar NOT NULL, PRIMARY KEY ("subscription_id", "tag_id"))`);
        await queryRunner.query(`INSERT INTO "temporary_subscription_tags"("subscription_id", "tag_id") SELECT "subscription_id", "tag_id" FROM "subscription_tags"`);
        await queryRunner.query(`DROP TABLE "subscription_tags"`);
        await queryRunner.query(`ALTER TABLE "temporary_subscription_tags" RENAME TO "subscription_tags"`);
        await queryRunner.query(`CREATE INDEX "IDX_subscription_tags_tag_id" ON "subscription_tags" ("tag_id") `);
        await queryRunner.query(`CREATE INDEX "IDX_subscription_tags_subscription_id" ON "subscription_tags" ("subscription_id") `);
        await queryRunner.query(`DROP INDEX "IDX_subscription_tags_tag_id"`);
        await queryRunner.query(`DROP INDEX "IDX_subscription_tags_subscription_id"`);
        await queryRunner.query(`CREATE TABLE "temporary_exchange_rate_fallback" ("id" varchar PRIMARY KEY NOT NULL, "base_currency" varchar(10) NOT NULL, "target_currency" varchar(10) NOT NULL, "rate" decimal(12,6) NOT NULL, "updated_at" datetime NOT NULL DEFAULT (datetime('now')), "last_fetched_at" datetime)`);
        await queryRunner.query(`INSERT INTO "temporary_exchange_rate_fallback"("id", "base_currency", "target_currency", "rate", "updated_at") SELECT "id", "base_currency", "target_currency", "rate", "updated_at" FROM "exchange_rate_fallback"`);
        await queryRunner.query(`DROP TABLE "exchange_rate_fallback"`);
        await queryRunner.query(`ALTER TABLE "temporary_exchange_rate_fallback" RENAME TO "exchange_rate_fallback"`);
        await queryRunner.query(`CREATE INDEX "IDX_6cdabc7a2570e6ebc729c90f90" ON "subscription_tags" ("subscription_id") `);
        await queryRunner.query(`CREATE INDEX "IDX_51442e1d2b2e19474b471d0863" ON "subscription_tags" ("tag_id") `);
        await queryRunner.query(`CREATE TABLE "temporary_tag" ("id" varchar PRIMARY KEY NOT NULL, "name" varchar(50) NOT NULL, "color" varchar(7) NOT NULL DEFAULT ('#6B7280'), "user_id" varchar(50) NOT NULL, "created_at" datetime NOT NULL DEFAULT (datetime('now')), CONSTRAINT "FK_d0be05b78e89aff4791e6189f77" FOREIGN KEY ("user_id") REFERENCES "user" ("id") ON DELETE CASCADE ON UPDATE NO ACTION)`);
        await queryRunner.query(`INSERT INTO "temporary_tag"("id", "name", "color", "user_id", "created_at") SELECT "id", "name", "color", "user_id", "created_at" FROM "tag"`);
        await queryRunner.query(`DROP TABLE "tag"`);
        await queryRunner.query(`ALTER TABLE "temporary_tag" RENAME TO "tag"`);
        await queryRunner.query(`CREATE TABLE "temporary_subscription_history" ("id" varchar PRIMARY KEY NOT NULL, "subscription_id" varchar(50) NOT NULL, "price" decimal(10,2) NOT NULL, "old_price" decimal(10,2), "currency" varchar(3) NOT NULL, "frequency" varchar CHECK( "frequency" IN ('MONTHLY','YEARLY') ) NOT NULL, "old_frequency" varchar CHECK( "old_frequency" IN ('MONTHLY','YEARLY') ), "effective_date" date NOT NULL, "created_at" datetime NOT NULL DEFAULT (datetime('now')), CONSTRAINT "FK_153e2b7a1a2d9cac822d93fe15f" FOREIGN KEY ("subscription_id") REFERENCES "subscription" ("id") ON DELETE CASCADE ON UPDATE NO ACTION)`);
        await queryRunner.query(`INSERT INTO "temporary_subscription_history"("id", "subscription_id", "price", "old_price", "currency", "frequency", "old_frequency", "effective_date", "created_at") SELECT "id", "subscription_id", "price", "old_price", "currency", "frequency", "old_frequency", "effective_date", "created_at" FROM "subscription_history"`);
        await queryRunner.query(`DROP TABLE "subscription_history"`);
        await queryRunner.query(`ALTER TABLE "temporary_subscription_history" RENAME TO "subscription_history"`);
        await queryRunner.query(`DROP INDEX "IDX_6cdabc7a2570e6ebc729c90f90"`);
        await queryRunner.query(`DROP INDEX "IDX_51442e1d2b2e19474b471d0863"`);
        await queryRunner.query(`CREATE TABLE "temporary_subscription_tags" ("subscription_id" varchar NOT NULL, "tag_id" varchar NOT NULL, CONSTRAINT "FK_6cdabc7a2570e6ebc729c90f90a" FOREIGN KEY ("subscription_id") REFERENCES "subscription" ("id") ON DELETE CASCADE ON UPDATE CASCADE, CONSTRAINT "FK_51442e1d2b2e19474b471d08639" FOREIGN KEY ("tag_id") REFERENCES "tag" ("id") ON DELETE NO ACTION ON UPDATE NO ACTION, PRIMARY KEY ("subscription_id", "tag_id"))`);
        await queryRunner.query(`INSERT INTO "temporary_subscription_tags"("subscription_id", "tag_id") SELECT "subscription_id", "tag_id" FROM "subscription_tags"`);
        await queryRunner.query(`DROP TABLE "subscription_tags"`);
        await queryRunner.query(`ALTER TABLE "temporary_subscription_tags" RENAME TO "subscription_tags"`);
        await queryRunner.query(`CREATE INDEX "IDX_6cdabc7a2570e6ebc729c90f90" ON "subscription_tags" ("subscription_id") `);
        await queryRunner.query(`CREATE INDEX "IDX_51442e1d2b2e19474b471d0863" ON "subscription_tags" ("tag_id") `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX "IDX_51442e1d2b2e19474b471d0863"`);
        await queryRunner.query(`DROP INDEX "IDX_6cdabc7a2570e6ebc729c90f90"`);
        await queryRunner.query(`ALTER TABLE "subscription_tags" RENAME TO "temporary_subscription_tags"`);
        await queryRunner.query(`CREATE TABLE "subscription_tags" ("subscription_id" varchar NOT NULL, "tag_id" varchar NOT NULL, PRIMARY KEY ("subscription_id", "tag_id"))`);
        await queryRunner.query(`INSERT INTO "subscription_tags"("subscription_id", "tag_id") SELECT "subscription_id", "tag_id" FROM "temporary_subscription_tags"`);
        await queryRunner.query(`DROP TABLE "temporary_subscription_tags"`);
        await queryRunner.query(`CREATE INDEX "IDX_51442e1d2b2e19474b471d0863" ON "subscription_tags" ("tag_id") `);
        await queryRunner.query(`CREATE INDEX "IDX_6cdabc7a2570e6ebc729c90f90" ON "subscription_tags" ("subscription_id") `);
        await queryRunner.query(`ALTER TABLE "subscription_history" RENAME TO "temporary_subscription_history"`);
        await queryRunner.query(`CREATE TABLE "subscription_history" ("id" varchar PRIMARY KEY NOT NULL, "subscription_id" varchar(50) NOT NULL, "price" decimal(10,2) NOT NULL, "old_price" decimal(10,2), "currency" varchar(3) NOT NULL, "frequency" varchar CHECK( "frequency" IN ('MONTHLY','YEARLY') ) NOT NULL, "old_frequency" varchar CHECK( "old_frequency" IN ('MONTHLY','YEARLY') ), "effective_date" date NOT NULL, "created_at" datetime NOT NULL DEFAULT (datetime('now')))`);
        await queryRunner.query(`INSERT INTO "subscription_history"("id", "subscription_id", "price", "old_price", "currency", "frequency", "old_frequency", "effective_date", "created_at") SELECT "id", "subscription_id", "price", "old_price", "currency", "frequency", "old_frequency", "effective_date", "created_at" FROM "temporary_subscription_history"`);
        await queryRunner.query(`DROP TABLE "temporary_subscription_history"`);
        await queryRunner.query(`ALTER TABLE "tag" RENAME TO "temporary_tag"`);
        await queryRunner.query(`CREATE TABLE "tag" ("id" varchar PRIMARY KEY NOT NULL, "name" varchar(50) NOT NULL, "color" varchar(7) NOT NULL DEFAULT ('#6B7280'), "user_id" varchar(50) NOT NULL, "created_at" datetime NOT NULL DEFAULT (datetime('now')))`);
        await queryRunner.query(`INSERT INTO "tag"("id", "name", "color", "user_id", "created_at") SELECT "id", "name", "color", "user_id", "created_at" FROM "temporary_tag"`);
        await queryRunner.query(`DROP TABLE "temporary_tag"`);
        await queryRunner.query(`DROP INDEX "IDX_51442e1d2b2e19474b471d0863"`);
        await queryRunner.query(`DROP INDEX "IDX_6cdabc7a2570e6ebc729c90f90"`);
        await queryRunner.query(`ALTER TABLE "exchange_rate_fallback" RENAME TO "temporary_exchange_rate_fallback"`);
        await queryRunner.query(`CREATE TABLE "exchange_rate_fallback" ("id" varchar PRIMARY KEY NOT NULL, "base_currency" varchar(10) NOT NULL, "target_currency" varchar(10) NOT NULL, "rate" decimal(12,6) NOT NULL, "updated_at" datetime NOT NULL DEFAULT (datetime('now')))`);
        await queryRunner.query(`INSERT INTO "exchange_rate_fallback"("id", "base_currency", "target_currency", "rate", "updated_at") SELECT "id", "base_currency", "target_currency", "rate", "updated_at" FROM "temporary_exchange_rate_fallback"`);
        await queryRunner.query(`DROP TABLE "temporary_exchange_rate_fallback"`);
        await queryRunner.query(`CREATE INDEX "IDX_subscription_tags_subscription_id" ON "subscription_tags" ("subscription_id") `);
        await queryRunner.query(`CREATE INDEX "IDX_subscription_tags_tag_id" ON "subscription_tags" ("tag_id") `);
        await queryRunner.query(`DROP INDEX "IDX_subscription_tags_subscription_id"`);
        await queryRunner.query(`DROP INDEX "IDX_subscription_tags_tag_id"`);
        await queryRunner.query(`ALTER TABLE "subscription_tags" RENAME TO "temporary_subscription_tags"`);
        await queryRunner.query(`CREATE TABLE "subscription_tags" ("subscription_id" varchar NOT NULL, "tag_id" varchar NOT NULL, CONSTRAINT "FK_subscription_tags_tag" FOREIGN KEY ("tag_id") REFERENCES "tag" ("id") ON DELETE CASCADE ON UPDATE CASCADE, CONSTRAINT "FK_subscription_tags_subscription" FOREIGN KEY ("subscription_id") REFERENCES "subscription" ("id") ON DELETE CASCADE ON UPDATE CASCADE, PRIMARY KEY ("subscription_id", "tag_id"))`);
        await queryRunner.query(`INSERT INTO "subscription_tags"("subscription_id", "tag_id") SELECT "subscription_id", "tag_id" FROM "temporary_subscription_tags"`);
        await queryRunner.query(`DROP TABLE "temporary_subscription_tags"`);
        await queryRunner.query(`CREATE INDEX "IDX_subscription_tags_subscription_id" ON "subscription_tags" ("subscription_id") `);
        await queryRunner.query(`CREATE INDEX "IDX_subscription_tags_tag_id" ON "subscription_tags" ("tag_id") `);
        await queryRunner.query(`ALTER TABLE "subscription_history" RENAME TO "temporary_subscription_history"`);
        await queryRunner.query(`CREATE TABLE "subscription_history" ("id" varchar PRIMARY KEY NOT NULL, "subscription_id" varchar(50) NOT NULL, "price" decimal(10,2) NOT NULL, "old_price" decimal(10,2), "currency" varchar(3) NOT NULL, "frequency" varchar CHECK( "frequency" IN ('MONTHLY','YEARLY') ) NOT NULL, "old_frequency" varchar CHECK( "old_frequency" IN ('MONTHLY','YEARLY') ), "effective_date" date NOT NULL, "created_at" datetime NOT NULL DEFAULT (datetime('now')), CONSTRAINT "FK_subscription_history_subscription" FOREIGN KEY ("subscription_id") REFERENCES "subscription" ("id") ON DELETE CASCADE ON UPDATE NO ACTION)`);
        await queryRunner.query(`INSERT INTO "subscription_history"("id", "subscription_id", "price", "old_price", "currency", "frequency", "old_frequency", "effective_date", "created_at") SELECT "id", "subscription_id", "price", "old_price", "currency", "frequency", "old_frequency", "effective_date", "created_at" FROM "temporary_subscription_history"`);
        await queryRunner.query(`DROP TABLE "temporary_subscription_history"`);
        await queryRunner.query(`ALTER TABLE "tag" RENAME TO "temporary_tag"`);
        await queryRunner.query(`CREATE TABLE "tag" ("id" varchar PRIMARY KEY NOT NULL, "name" varchar(50) NOT NULL, "color" varchar(7) NOT NULL DEFAULT ('#6B7280'), "user_id" varchar(50) NOT NULL, "created_at" datetime NOT NULL DEFAULT (datetime('now')), CONSTRAINT "FK_tag_user" FOREIGN KEY ("user_id") REFERENCES "user" ("id") ON DELETE CASCADE ON UPDATE NO ACTION)`);
        await queryRunner.query(`INSERT INTO "tag"("id", "name", "color", "user_id", "created_at") SELECT "id", "name", "color", "user_id", "created_at" FROM "temporary_tag"`);
        await queryRunner.query(`DROP TABLE "temporary_tag"`);
    }

}
