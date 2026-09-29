import { Module } from '@nestjs/common';
import { DatabaseModule } from './database/database.module';
import { ExecutionsConsumer } from './modules/executions/executions.consumer';
import { ExecutionsModule } from './modules/executions/executions.module';

@Module({
  imports: [DatabaseModule, ExecutionsModule],
  providers: [ExecutionsConsumer],
})
export class WorkerModule {}
