import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateAgentExecutions1740000001000 implements MigrationInterface {
  name = 'CreateAgentExecutions1740000001000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "agent_executions" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "agent_id" uuid NOT NULL,
        "input" text NOT NULL,
        "output" text,
        "status" varchar(20) NOT NULL DEFAULT 'PENDING',
        "input_tokens" integer NOT NULL DEFAULT 0,
        "output_tokens" integer NOT NULL DEFAULT 0,
        "total_tokens" integer NOT NULL DEFAULT 0,
        "error" text,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "started_at" timestamptz,
        "completed_at" timestamptz,
        CONSTRAINT "pk_agent_executions" PRIMARY KEY ("id"),
        CONSTRAINT "fk_agent_executions_agent" FOREIGN KEY ("agent_id") REFERENCES "agents" ("id")
      )
    `);
    await queryRunner.query(`CREATE INDEX "idx_agent_executions_agent_id" ON "agent_executions" ("agent_id")`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "agent_executions"`);
  }
}
