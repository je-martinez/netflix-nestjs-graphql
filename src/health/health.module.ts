import { Module } from '@nestjs/common';
import { TerminusModule } from '@nestjs/terminus';
import { HttpModule } from '@nestjs/axios';
import { HealthController } from './health.controller';
import { DatabaseModule } from '../database/database.module';

@Module({
  imports: [TerminusModule, HttpModule, DatabaseModule],
  controllers: [HealthController],
})
export class HealthModule { }
