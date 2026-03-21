import { SecretsManagerClient, CreateSecretCommand, PutSecretValueCommand } from '@aws-sdk/client-secrets-manager';
import { SSMClient, PutParameterCommand } from '@aws-sdk/client-ssm';
import { Logger } from '@nestjs/common';
import { config } from 'dotenv';
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

// Explicit lists of env keys to sync — no prefix inference
const SECRET_KEYS: string[] = [
    'DATABASE_URL',
    'DATABASE_URL_REPLICA_1',
    'DATABASE_URL_REPLICA_2',
];

const SSM_KEYS: string[] = [];

async function syncSecret(key: string, value: string): Promise<void> {
    try {
        await secretsClient.send(new CreateSecretCommand({ Name: key, SecretString: value }));
        logger.log(`Created secret: ${key}`);
    } catch (err: any) {
        if (err.name === 'ResourceExistsException') {
            await secretsClient.send(new PutSecretValueCommand({ SecretId: key, SecretString: value }));
            logger.log(`Updated secret: ${key}`);
        } else {
            logger.error(`Failed to sync secret ${key}:`, err.message);
        }
    }
}

async function syncSsmParameter(key: string, value: string): Promise<void> {
    try {
        const ssmName = `/app/${key}`;
        await ssmClient.send(new PutParameterCommand({ Name: ssmName, Value: value, Type: 'String', Overwrite: true }));
        logger.log(`Put SSM parameter: ${ssmName}`);
    } catch (err: any) {
        logger.error(`Failed to sync SSM parameter ${key}:`, err.message);
    }
}

async function sync() {
    logger.log('Starting sync to LocalStack...');

    for (const key of SECRET_KEYS) {
        const value = envConfig[key];
        if (value === undefined) {
            logger.warn(`Secret key "${key}" not found in .env — skipping`);
            continue;
        }
        await syncSecret(key, value);
    }

    for (const key of SSM_KEYS) {
        const value = envConfig[key];
        if (value === undefined) {
            logger.warn(`SSM key "${key}" not found in .env — skipping`);
            continue;
        }
        await syncSsmParameter(key, value);
    }

    logger.log('Sync complete.');
}

sync().catch((err) => logger.error('Sync failed', err));
