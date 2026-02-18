import { Controller, Get } from '@nestjs/common';
import { HealthCheck, HealthCheckService, HttpHealthIndicator, PrismaHealthIndicator } from '@nestjs/terminus';
import { PrismaClient } from '@prisma/client';

@Controller('health')
export class HealthController {
    private prisma = new PrismaClient();

    constructor(
        private health: HealthCheckService,
        private http: HttpHealthIndicator,
        private prismaHealth: PrismaHealthIndicator,
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
