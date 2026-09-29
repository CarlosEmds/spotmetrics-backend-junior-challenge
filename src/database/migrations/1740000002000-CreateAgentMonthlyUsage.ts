import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateAgentMonthlyUsage1740000002000 implements MigrationInterface {
  name = 'CreateAgentMonthlyUsage1740000002000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "agent_monthly_usage" (
        "id" serial NOT NULL,
        "agent_id" uuid NOT NULL,
        "month" char(7) NOT NULL,
        "tokens_used" integer NOT NULL DEFAULT 0,
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "pk_agent_monthly_usage" PRIMARY KEY ("id"),
        CONSTRAINT "fk_agent_monthly_usage_agent" FOREIGN KEY ("agent_id") REFERENCES "agents" ("id"),
        CONSTRAINT "uq_agent_monthly_usage_agent_month" UNIQUE ("agent_id", "month")
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "agent_monthly_usage"`);
  }
}
