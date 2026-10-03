import { ApiProperty } from '@nestjs/swagger';
import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';
import { ExecutionStatus } from './execution-status.enum';

@Entity({ name: 'agent_executions' })
export class AgentExecution {
  @ApiProperty({ format: 'uuid' })
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ApiProperty({ format: 'uuid' })
  @Index()
  @Column({ name: 'agent_id', type: 'uuid' })
  agentId: string;

  @ApiProperty({ example: 'Resuma o relatório de vendas do trimestre.' })
  @Column({ type: 'text' })
  input: string;

  @ApiProperty({ type: String, nullable: true, description: 'Preenchido quando a execução conclui' })
  @Column({ type: 'text', nullable: true })
  output: string | null;

  @ApiProperty({ enum: ExecutionStatus })
  @Column({ type: 'varchar', length: 20, default: ExecutionStatus.PENDING })
  status: ExecutionStatus;

  @ApiProperty({ type: String, nullable: true, description: 'Motivo da falha, quando FAILED' })
  @Column({ type: 'text', nullable: true })
  error: string | null;

  @ApiProperty({ example: 6 })
  @Column({ name: 'input_tokens', type: 'integer', default: 0 })
  inputTokens: number;

  @ApiProperty({ description: '0 até a execução concluir' })
  @Column({ name: 'output_tokens', type: 'integer', default: 0 })
  outputTokens: number;

  @ApiProperty({ description: 'inputTokens + outputTokens, gravado na conclusão; é o que entra no consumo mensal' })
  @Column({ name: 'total_tokens', type: 'integer', default: 0 })
  totalTokens: number;

  @ApiProperty()
  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @ApiProperty({ type: Date, nullable: true })
  @Column({ name: 'started_at', type: 'timestamptz', nullable: true })
  startedAt: Date | null;

  @ApiProperty({ type: Date, nullable: true })
  @Column({ name: 'completed_at', type: 'timestamptz', nullable: true })
  completedAt: Date | null;
}
