import { ApiProperty } from '@nestjs/swagger';
import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

// Os controllers devolvem a entidade, então os @ApiProperty daqui descrevem as respostas no Swagger.
@Entity({ name: 'agents' })
export class Agent {
  @ApiProperty({ format: 'uuid' })
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ApiProperty({ example: 'Support Assistant' })
  @Column({ length: 120 })
  name: string;

  @ApiProperty({ type: String, nullable: true, example: 'Responde dúvidas de clientes' })
  @Column({ type: 'text', nullable: true })
  description: string | null;

  @ApiProperty({ example: 'Você é um assistente de suporte cordial.' })
  @Column({ name: 'system_prompt', type: 'text' })
  systemPrompt: string;

  @ApiProperty({ description: 'false = desativado (soft delete): novas execuções são recusadas' })
  @Column({ default: true })
  active: boolean;

  @ApiProperty({ example: 10000 })
  @Column({ name: 'monthly_token_limit', type: 'integer' })
  monthlyTokenLimit: number;

  @ApiProperty()
  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @ApiProperty()
  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
