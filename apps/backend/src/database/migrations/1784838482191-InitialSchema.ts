import { MigrationInterface, QueryRunner } from "typeorm";

export class InitialSchema1784838482191 implements MigrationInterface {
    name = 'InitialSchema1784838482191'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "user" ("id" varchar PRIMARY KEY NOT NULL, "username" varchar(20) NOT NULL, "email" varchar NOT NULL, "password" varchar NOT NULL, "createdAt" datetime NOT NULL DEFAULT (datetime('now')), "updatedAt" datetime NOT NULL DEFAULT (datetime('now')), "telegramUsername" varchar(100), CONSTRAINT "UQ_78a916df40e02a9deb1c4b75edb" UNIQUE ("username"), CONSTRAINT "UQ_e12875dfb3b1d92d7d7c5377e22" UNIQUE ("email"))`);
        await queryRunner.query(`CREATE TABLE "subscription" ("id" varchar PRIMARY KEY NOT NULL, "name" varchar(100) NOT NULL, "price" decimal(10,2) NOT NULL, "currency" varchar(3) NOT NULL, "frequency" varchar CHECK( "frequency" IN ('MONTHLY','YEARLY') ) NOT NULL, "start_date" date NOT NULL, "next_renewal_date" date NOT NULL, "is_active" boolean NOT NULL DEFAULT (1), "type" varchar CHECK( "type" IN ('SUBSCRIPTION','DOMAIN','HOSTING') ) NOT NULL DEFAULT ('SUBSCRIPTION'), "user_id" varchar(50) NOT NULL, "created_at" datetime NOT NULL DEFAULT (datetime('now')), "updated_at" datetime NOT NULL DEFAULT (datetime('now')))`);
        await queryRunner.query(`CREATE TABLE "temporary_subscription" ("id" varchar PRIMARY KEY NOT NULL, "name" varchar(100) NOT NULL, "price" decimal(10,2) NOT NULL, "currency" varchar(3) NOT NULL, "frequency" varchar CHECK( "frequency" IN ('MONTHLY','YEARLY') ) NOT NULL, "start_date" date NOT NULL, "next_renewal_date" date NOT NULL, "is_active" boolean NOT NULL DEFAULT (1), "type" varchar CHECK( "type" IN ('SUBSCRIPTION','DOMAIN','HOSTING') ) NOT NULL DEFAULT ('SUBSCRIPTION'), "user_id" varchar(50) NOT NULL, "created_at" datetime NOT NULL DEFAULT (datetime('now')), "updated_at" datetime NOT NULL DEFAULT (datetime('now')), CONSTRAINT "FK_940d49a105d50bbd616be540013" FOREIGN KEY ("user_id") REFERENCES "user" ("id") ON DELETE CASCADE ON UPDATE NO ACTION)`);
        await queryRunner.query(`INSERT INTO "temporary_subscription"("id", "name", "price", "currency", "frequency", "start_date", "next_renewal_date", "is_active", "type", "user_id", "created_at", "updated_at") SELECT "id", "name", "price", "currency", "frequency", "start_date", "next_renewal_date", "is_active", "type", "user_id", "created_at", "updated_at" FROM "subscription"`);
        await queryRunner.query(`DROP TABLE "subscription"`);
        await queryRunner.query(`ALTER TABLE "temporary_subscription" RENAME TO "subscription"`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "subscription" RENAME TO "temporary_subscription"`);
        await queryRunner.query(`CREATE TABLE "subscription" ("id" varchar PRIMARY KEY NOT NULL, "name" varchar(100) NOT NULL, "price" decimal(10,2) NOT NULL, "currency" varchar(3) NOT NULL, "frequency" varchar CHECK( "frequency" IN ('MONTHLY','YEARLY') ) NOT NULL, "start_date" date NOT NULL, "next_renewal_date" date NOT NULL, "is_active" boolean NOT NULL DEFAULT (1), "type" varchar CHECK( "type" IN ('SUBSCRIPTION','DOMAIN','HOSTING') ) NOT NULL DEFAULT ('SUBSCRIPTION'), "user_id" varchar(50) NOT NULL, "created_at" datetime NOT NULL DEFAULT (datetime('now')), "updated_at" datetime NOT NULL DEFAULT (datetime('now')))`);
        await queryRunner.query(`INSERT INTO "subscription"("id", "name", "price", "currency", "frequency", "start_date", "next_renewal_date", "is_active", "type", "user_id", "created_at", "updated_at") SELECT "id", "name", "price", "currency", "frequency", "start_date", "next_renewal_date", "is_active", "type", "user_id", "created_at", "updated_at" FROM "temporary_subscription"`);
        await queryRunner.query(`DROP TABLE "temporary_subscription"`);
        await queryRunner.query(`DROP TABLE "subscription"`);
        await queryRunner.query(`DROP TABLE "user"`);
    }

}
