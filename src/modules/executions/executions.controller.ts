import { Body, Controller, Get, Param, ParseUUIDPipe, Post, Query } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiServiceUnavailableResponse,
  ApiTags,
  ApiTooManyRequestsResponse,
} from '@nestjs/swagger';
import { AgentExecution } from './agent-execution.entity';
import { AgentMetricsDto } from './dto/agent-metrics.dto';
import { CreateExecutionDto } from './dto/create-execution.dto';
import { ExecutionPageDto } from './dto/execution-page.dto';
import { ListExecutionsQueryDto } from './dto/list-executions-query.dto';
import { ExecutionsService } from './executions.service';

@ApiTags('executions')
@Controller()
export class ExecutionsController {
  constructor(private readonly executionsService: ExecutionsService) {}

  @Post('agents/:agentId/executions')
  @ApiOperation({ summary: 'Enfileira uma execução; o worker processa depois (acompanhe em GET /executions/{id})' })
  @ApiCreatedResponse({ type: AgentExecution, description: 'Execução gravada como PENDING e publicada na fila' })
  @ApiBadRequestResponse({ description: 'input em branco, maior que 10.000 caracteres, campo desconhecido ou id que não é UUID' })
  @ApiNotFoundResponse({ description: 'Agente não encontrado' })
  @ApiConflictResponse({ description: 'Agente inativo' })
  @ApiTooManyRequestsResponse({
    description: 'Limite mensal de tokens atingido; o corpo traz monthlyTokenLimit e tokensUsed',
  })
  @ApiServiceUnavailableResponse({ description: 'Fila indisponível; a execução fica gravada como FAILED' })
  create(@Param('agentId', ParseUUIDPipe) agentId: string, @Body() dto: CreateExecutionDto) {
    return this.executionsService.create(agentId, dto);
  }

  @Get('agents/:agentId/executions')
  @ApiOperation({ summary: 'Histórico de execuções do agente, paginado, com filtro por status' })
  @ApiOkResponse({ type: ExecutionPageDto, description: 'Uma página do histórico' })
  @ApiBadRequestResponse({
    description: 'Parâmetro inválido (ex.: status desconhecido, limit acima de 100, page 0) ou id que não é UUID',
  })
  @ApiNotFoundResponse({ description: 'Agente não encontrado' })
  listByAgent(@Param('agentId', ParseUUIDPipe) agentId: string, @Query() query: ListExecutionsQueryDto) {
    return this.executionsService.listByAgent(agentId, query);
  }

  @Get('agents/:agentId/metrics')
  @ApiOperation({ summary: 'Métricas do agente: execuções por status, tokens consumidos e média por execução concluída' })
  @ApiOkResponse({ type: AgentMetricsDto, description: 'Métricas do agente' })
  @ApiBadRequestResponse({ description: 'Id que não é UUID' })
  @ApiNotFoundResponse({ description: 'Agente não encontrado' })
  getMetrics(@Param('agentId', ParseUUIDPipe) agentId: string) {
    return this.executionsService.getMetrics(agentId);
  }

  @Get('executions/:id')
  @ApiOperation({ summary: 'Busca uma execução por id: status, output, tokens e erro' })
  @ApiOkResponse({ type: AgentExecution, description: 'Execução encontrada' })
  @ApiBadRequestResponse({ description: 'Id que não é UUID' })
  @ApiNotFoundResponse({ description: 'Execução não encontrada' })
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.executionsService.findOne(id);
  }
}
