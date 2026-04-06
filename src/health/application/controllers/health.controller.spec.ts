import { HealthController } from '@/health/application/controllers/health.controller';
import { HealthCheckService, HttpHealthIndicator, PrismaHealthIndicator } from '@nestjs/terminus';
import { Test, TestingModule } from '@nestjs/testing';
import { AwsHealthIndicator } from '@/health/infrastructure/indicators/aws.health';
import { RedisHealthIndicator } from '@/health/infrastructure/indicators/redis.health';
import { PrismaService } from '@/database/prisma.service';

const mockProvider = () => ({ check: jest.fn(), pingCheck: jest.fn(), checkSecretsManager: jest.fn(), checkSsm: jest.fn() });

describe('HealthController', () => {
  let controller: HealthController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [HealthController],
      providers: [
        { provide: HealthCheckService, useValue: mockProvider() },
        { provide: HttpHealthIndicator, useValue: mockProvider() },
        { provide: PrismaHealthIndicator, useValue: mockProvider() },
        { provide: PrismaService, useValue: {} },
        { provide: AwsHealthIndicator, useValue: mockProvider() },
        { provide: RedisHealthIndicator, useValue: mockProvider() },
      ],
    }).compile();

    controller = module.get<HealthController>(HealthController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
