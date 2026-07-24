import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddTagsAndSubscriptionTags1784838482194 implements MigrationInterface {
  name = 'AddTagsAndSubscriptionTags1784838482194';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "tag" ("id" varchar PRIMARY KEY NOT NULL, "name" varchar(50) NOT NULL, "color" varchar(7) NOT NULL DEFAULT ('#6B7280'), "user_id" varchar(50) NOT NULL, "created_at" datetime NOT NULL DEFAULT (datetime('now')), CONSTRAINT "FK_tag_user" FOREIGN KEY ("user_id") REFERENCES "user" ("id") ON DELETE CASCADE ON UPDATE NO ACTION)`,
    );
    await queryRunner.query(
      `CREATE TABLE "subscription_tags" ("subscription_id" varchar NOT NULL, "tag_id" varchar NOT NULL, PRIMARY KEY ("subscription_id", "tag_id"), CONSTRAINT "FK_subscription_tags_subscription" FOREIGN KEY ("subscription_id") REFERENCES "subscription" ("id") ON DELETE CASCADE ON UPDATE CASCADE, CONSTRAINT "FK_subscription_tags_tag" FOREIGN KEY ("tag_id") REFERENCES "tag" ("id") ON DELETE CASCADE ON UPDATE CASCADE)`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_subscription_tags_subscription_id" ON "subscription_tags" ("subscription_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_subscription_tags_tag_id" ON "subscription_tags" ("tag_id")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "IDX_subscription_tags_tag_id"`);
    await queryRunner.query(`DROP INDEX "IDX_subscription_tags_subscription_id"`);
    await queryRunner.query(`DROP TABLE "subscription_tags"`);
    await queryRunner.query(`DROP TABLE "tag"`);
  }
}
