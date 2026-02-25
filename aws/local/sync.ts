import { SecretsManagerClient, CreateSecretCommand, PutSecretValueCommand } from '@aws-sdk/client-secrets-manager';
import { SSMClient, PutParameterCommand } from '@aws-sdk/client-ssm';
import { Logger } from '@nestjs/common';
import { config } from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';

const logger = new Logger('LocalStackSync');

// Load .env
const envPath = path.resolve(__dirname, '../../.env');
const envConfig = config({ path: envPath }).parsed || {};

const localstackUrl = 'http://localhost:4566';
const region = 'us-east-1';

const credentials = { accessKeyId: 'test', secretAccessKey: 'test' };

const secretsClient = new SecretsManagerClient({
    endpoint: localstackUrl,
    region,
    credentials,
});

const ssmClient = new SSMClient({
    endpoint: localstackUrl,
    region,
    credentials,
});

async function sync() {
    logger.log('Starting sync to LocalStack...');

    for (const [key, value] of Object.entries(envConfig)) {
        if (key.startsWith('SECRET_')) {
            try {
                await secretsClient.send(
                    new CreateSecretCommand({
                        Name: key,
                        SecretString: value,
                    })
                );
                logger.log(`Created secret: ${key}`);
            } catch (err: any) {
                if (err.name === 'ResourceExistsException') {
                    await secretsClient.send(
                        new PutSecretValueCommand({
                            SecretId: key,
                            SecretString: value,
                        })
                    );
                    logger.log(`Updated secret: ${key}`);
                } else {
                    logger.error(`Failed to sync secret ${key}:`, err.message);
                }
            }
        } else if (key.startsWith('SSM_')) {
            try {
                const ssmName = `/app/${key}`;
                await ssmClient.send(
                    new PutParameterCommand({
                        Name: ssmName,
                        Value: value,
                        Type: 'String',
                        Overwrite: true,
                    })
                );
                logger.log(`Put SSM parameter: ${ssmName}`);
            } catch (err: any) {
                logger.error(`Failed to sync SSM parameter ${key}:`, err.message);
            }
        }
    }

    logger.log('Sync complete.');
}

sync().catch((err) => logger.error('Sync failed', err));
