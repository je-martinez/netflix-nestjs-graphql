import { Controller, Get } from '@nestjs/common';
import { HealthCheck, HealthCheckService, HttpHealthIndicator, PrismaHealthIndicator } from '@nestjs/terminus';
import { PrismaService } from '../database/prisma.service';

@Controller('health')
export class HealthController {
    constructor(
        private health: HealthCheckService,
        private http: HttpHealthIndicator,
        private prismaHealth: PrismaHealthIndicator,
        private prisma: PrismaService,
    ) { }

    @Get('live')
    @HealthCheck()
    checkLiveness() {
        return this.health.check([
            () => this.http.pingCheck('nestjs-docs', 'https://docs.nestjs.com'),
        ]);
    }

    @Get('ready')
    @HealthCheck()
    checkReadiness() {
        return this.health.check([
            () => this.prismaHealth.pingCheck('database', this.prisma),
        ]);
    }
}
