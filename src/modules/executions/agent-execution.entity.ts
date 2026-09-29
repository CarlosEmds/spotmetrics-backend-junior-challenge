import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';
import { ExecutionStatus } from './execution-status.enum';

@Entity({ name: 'agent_executions' })
export class AgentExecution {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ name: 'agent_id', type: 'uuid' })
  agentId: string;

  @Column({ type: 'text' })
  input: string;

  @Column({ type: 'text', nullable: true })
  output: string | null;

  @Column({ type: 'varchar', length: 20, default: ExecutionStatus.PENDING })
  status: ExecutionStatus;

  @Column({ type: 'text', nullable: true })
  error: string | null;

  @Column({ name: 'input_tokens', type: 'integer', default: 0 })
  inputTokens: number;

  @Column({ name: 'output_tokens', type: 'integer', default: 0 })
  outputTokens: number;

  @Column({ name: 'total_tokens', type: 'integer', default: 0 })
  totalTokens: number;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @Column({ name: 'started_at', type: 'timestamptz', nullable: true })
  startedAt: Date | null;

  @Column({ name: 'completed_at', type: 'timestamptz', nullable: true })
  completedAt: Date | null;
}
