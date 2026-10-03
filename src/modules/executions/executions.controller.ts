import { Body, Controller, Get, Param, ParseUUIDPipe, Post, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { CreateExecutionDto } from './dto/create-execution.dto';
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
  listByAgent(@Param('agentId', ParseUUIDPipe) agentId: string, @Query() query: ListExecutionsQueryDto) {
    return this.executionsService.listByAgent(agentId, query);
  }

  @Get('agents/:agentId/metrics')
  @ApiOperation({ summary: 'Métricas do agente: execuções por status, tokens consumidos e média por execução concluída' })
  getMetrics(@Param('agentId', ParseUUIDPipe) agentId: string) {
    return this.executionsService.getMetrics(agentId);
  }

  @Get('executions/:id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.executionsService.findOne(id);
  }
}
