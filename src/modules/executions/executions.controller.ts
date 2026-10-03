import { Body, Controller, Get, Param, ParseUUIDPipe, Post, Query } from '@nestjs/common';
import { ApiBadRequestResponse, ApiNotFoundResponse, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
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
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.executionsService.findOne(id);
  }
}
