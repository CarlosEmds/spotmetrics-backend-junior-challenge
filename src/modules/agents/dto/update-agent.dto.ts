import { PartialType } from '@nestjs/swagger';
import { CreateAgentDto } from './create-agent.dto';

/**
 * Mesmos campos e validações do CreateAgentDto, todos opcionais.
 * skipNullProperties: false faz o null ser validado (e recusado) em vez de ignorado,
 * para que { "name": null } vire 400 e não um erro de NOT NULL no banco.
 */
export class UpdateAgentDto extends PartialType(CreateAgentDto, { skipNullProperties: false }) {}
