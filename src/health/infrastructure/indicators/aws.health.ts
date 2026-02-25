import { Injectable } from '@nestjs/common';
import { HealthIndicatorResult, HealthIndicatorService } from '@nestjs/terminus';
import { SecretsManagerClient, ListSecretsCommand } from '@aws-sdk/client-secrets-manager';
import { SSMClient, DescribeParametersCommand } from '@aws-sdk/client-ssm';

@Injectable()
export class AwsHealthIndicator {
    private secretsClient: SecretsManagerClient;
    private ssmClient: SSMClient;

    constructor(private healthIndicatorService: HealthIndicatorService) {
        const isLocal = process.env.ENV === 'local';
        const awsConfig = isLocal
            ? {
                endpoint: 'http://localhost:4566',
                region: 'us-east-1',
                credentials: { accessKeyId: 'test', secretAccessKey: 'test' },
            }
            : {};

        this.secretsClient = new SecretsManagerClient(awsConfig);
        this.ssmClient = new SSMClient(awsConfig);
    }

    async checkSecretsManager(key: string): Promise<HealthIndicatorResult> {
        const indicator = this.healthIndicatorService.check(key);
        try {
            await this.secretsClient.send(new ListSecretsCommand({ MaxResults: 1 }));
            return indicator.up();
        } catch (e: any) {
            return indicator.down({ message: e.message });
        }
    }

    async checkSsm(key: string): Promise<HealthIndicatorResult> {
        const indicator = this.healthIndicatorService.check(key);
        try {
            await this.ssmClient.send(new DescribeParametersCommand({ MaxResults: 1 }));
            return indicator.up();
        } catch (e: any) {
            return indicator.down({ message: e.message });
        }
    }
}
