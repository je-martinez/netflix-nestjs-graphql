import { DatabaseModule } from '@/database/database.module';
import { HealthController } from '@/health/application/controllers/health.controller';
import { AwsHealthIndicator } from '@/health/infrastructure/indicators/aws.health';
import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';
import { TerminusModule } from '@nestjs/terminus';

@Module({
  imports: [TerminusModule, HttpModule, DatabaseModule],
  controllers: [HealthController],
  providers: [AwsHealthIndicator],
})
export class HealthModule { }
