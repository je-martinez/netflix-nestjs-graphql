import { PrismaService } from '@/database/prisma.service';
import { AwsHealthIndicator } from '@/health/infrastructure/indicators/aws.health';
import { RedisHealthIndicator } from '@/health/infrastructure/indicators/redis.health';
import { Controller, Get } from '@nestjs/common';
import { HealthCheck, HealthCheckService, HttpHealthIndicator, PrismaHealthIndicator } from '@nestjs/terminus';

@Controller('health')
export class HealthController {
    constructor(
        private health: HealthCheckService,
        private http: HttpHealthIndicator,
        private prismaHealth: PrismaHealthIndicator,
        private prisma: PrismaService,
        private awsHealth: AwsHealthIndicator,
        private redisHealth: RedisHealthIndicator,
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
            () => this.awsHealth.checkSecretsManager('aws_secrets_manager'),
            () => this.awsHealth.checkSsm('aws_ssm'),
            () => this.redisHealth.check('redis'),
        ]);
    }
}
