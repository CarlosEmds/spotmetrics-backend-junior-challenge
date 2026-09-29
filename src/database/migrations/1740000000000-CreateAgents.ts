import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateAgents1740000000000 implements MigrationInterface {
  name = 'CreateAgents1740000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "agents" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "name" varchar(120) NOT NULL,
        "description" text,
        "system_prompt" text NOT NULL,
        "active" boolean NOT NULL DEFAULT true,
        "monthly_token_limit" integer NOT NULL,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "pk_agents" PRIMARY KEY ("id")
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "agents"`);
  }
}
