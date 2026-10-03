import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { Agent } from './agent.entity';
import { AgentsService } from './agents.service';
import { AgentUsageDto } from './dto/agent-usage.dto';
import { CreateAgentDto } from './dto/create-agent.dto';
import { UpdateAgentDto } from './dto/update-agent.dto';
import { UsageQueryDto } from './dto/usage-query.dto';

@ApiTags('agents')
@Controller('agents')
export class AgentsController {
  constructor(private readonly agentsService: AgentsService) {}

  @Post()
  @ApiOperation({ summary: 'Cria um agente' })
  @ApiCreatedResponse({ type: Agent, description: 'Agente criado' })
  @ApiBadRequestResponse({
    description: 'Body inválido (ex.: limite menor que 1 ou maior que 2.147.483.647, nome em branco, campo desconhecido)',
  })
  create(@Body() dto: CreateAgentDto) {
    return this.agentsService.create(dto);
  }

  @Get()
  @ApiOperation({ summary: 'Lista agentes' })
  @ApiOkResponse({ type: [Agent], description: 'Todos os agentes, inclusive os inativos, do mais novo para o mais antigo' })
  findAll() {
    return this.agentsService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Busca agente por id' })
  @ApiOkResponse({ type: Agent, description: 'Agente encontrado' })
  @ApiBadRequestResponse({ description: 'Id que não é UUID' })
  @ApiNotFoundResponse({ description: 'Agente não encontrado' })
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.agentsService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Atualiza um agente (só os campos enviados)' })
  @ApiOkResponse({ type: Agent, description: 'Agente atualizado' })
  @ApiBadRequestResponse({
    description: 'Body inválido (ex.: limite menor que 1, nome em branco, null, campo desconhecido) ou id que não é UUID',
  })
  @ApiNotFoundResponse({ description: 'Agente não encontrado' })
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateAgentDto) {
    return this.agentsService.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Desativa um agente (soft delete); o histórico é mantido' })
  @ApiNoContentResponse({ description: 'Agente desativado, sem corpo. Repetir também responde 204 (idempotente)' })
  @ApiBadRequestResponse({ description: 'Id que não é UUID' })
  @ApiNotFoundResponse({ description: 'Agente não encontrado' })
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.agentsService.remove(id);
  }

  @Get(':id/usage')
  @ApiOperation({ summary: 'Consumo de tokens do agente no mês' })
  @ApiOkResponse({ type: AgentUsageDto, description: 'Consumo do mês pedido (ou do mês atual, em UTC)' })
  @ApiBadRequestResponse({ description: 'month fora do formato YYYY-MM, parâmetro desconhecido ou id que não é UUID' })
  @ApiNotFoundResponse({ description: 'Agente não encontrado' })
  usage(@Param('id', ParseUUIDPipe) id: string, @Query() query: UsageQueryDto) {
    return this.agentsService.getUsage(id, query.month);
  }
}
