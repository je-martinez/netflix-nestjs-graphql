import { SecretsManagerClient, CreateSecretCommand, PutSecretValueCommand } from '@aws-sdk/client-secrets-manager';
import { SSMClient, PutParameterCommand } from '@aws-sdk/client-ssm';
import { config } from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';

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
    console.log('Starting sync to LocalStack...');

    for (const [key, value] of Object.entries(envConfig)) {
        if (key.startsWith('SECRET_')) {
            try {
                await secretsClient.send(
                    new CreateSecretCommand({
                        Name: key,
                        SecretString: value,
                    })
                );
                console.log(`Created secret: ${key}`);
            } catch (err: any) {
                if (err.name === 'ResourceExistsException') {
                    await secretsClient.send(
                        new PutSecretValueCommand({
                            SecretId: key,
                            SecretString: value,
                        })
                    );
                    console.log(`Updated secret: ${key}`);
                } else {
                    console.error(`Failed to sync secret ${key}:`, err.message);
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
                console.log(`Put SSM parameter: ${ssmName}`);
            } catch (err: any) {
                console.error(`Failed to sync SSM parameter ${key}:`, err.message);
            }
        }
    }

    console.log('Sync complete.');
}

sync().catch(console.error);
