import { Injectable } from '@nestjs/common';
import { HealthIndicator, HealthIndicatorResult, HealthCheckError } from '@nestjs/terminus';
import { SecretsManagerClient, ListSecretsCommand } from '@aws-sdk/client-secrets-manager';
import { SSMClient, DescribeParametersCommand } from '@aws-sdk/client-ssm';

@Injectable()
export class AwsHealthIndicator extends HealthIndicator {
    private secretsClient: SecretsManagerClient;
    private ssmClient: SSMClient;

    constructor() {
        super();
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
        try {
            await this.secretsClient.send(new ListSecretsCommand({ MaxResults: 1 }));
            return this.getStatus(key, true);
        } catch (e: any) {
            throw new HealthCheckError(
                'SecretsManager check failed',
                this.getStatus(key, false, { message: e.message }),
            );
        }
    }

    async checkSsm(key: string): Promise<HealthIndicatorResult> {
        try {
            await this.ssmClient.send(new DescribeParametersCommand({ MaxResults: 1 }));
            return this.getStatus(key, true);
        } catch (e: any) {
            throw new HealthCheckError(
                'SSM check failed',
                this.getStatus(key, false, { message: e.message }),
            );
        }
    }
}
