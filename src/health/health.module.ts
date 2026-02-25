import { Module } from '@nestjs/common';
import { TerminusModule } from '@nestjs/terminus';
import { HttpModule } from '@nestjs/axios';
import { HealthController } from './application/controllers/health.controller';
import { DatabaseModule } from '../database/database.module';
import { AwsHealthIndicator } from './infrastructure/indicators/aws.health';

@Module({
  imports: [TerminusModule, HttpModule, DatabaseModule],
  controllers: [HealthController],
  providers: [AwsHealthIndicator],
})
export class HealthModule { }
