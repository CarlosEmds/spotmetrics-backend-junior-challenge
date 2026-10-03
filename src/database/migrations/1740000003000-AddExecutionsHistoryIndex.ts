import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Atende o histórico (GET /agents/:id/executions): filtra por agente e ordena por created_at, id.
 * Com o índice nessa ordem, o Postgres lê as linhas já ordenadas e para no LIMIT, sem ordenar tudo.
 */
export class AddExecutionsHistoryIndex1740000003000 implements MigrationInterface {
  name = 'AddExecutionsHistoryIndex1740000003000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE INDEX "idx_agent_executions_agent_created" ON "agent_executions" ("agent_id", "created_at", "id")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "idx_agent_executions_agent_created"`);
  }
}
