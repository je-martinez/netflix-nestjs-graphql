import {
  SecretsManagerClient,
  GetSecretValueCommand,
} from '@aws-sdk/client-secrets-manager';
import { SSMClient, GetParameterCommand } from '@aws-sdk/client-ssm';

async function getSecret(
  client: SecretsManagerClient,
  secretId: string,
): Promise<string | undefined> {
  try {
    const response = await client.send(
      new GetSecretValueCommand({ SecretId: secretId }),
    );
    return response.SecretString;
  } catch (e) {
    console.warn(`Failed to fetch secret ${secretId}`, e);
    return undefined;
  }
}

async function getSsmParameter(
  client: SSMClient,
  name: string,
): Promise<string | undefined> {
  try {
    const response = await client.send(new GetParameterCommand({ Name: name }));
    return response.Parameter?.Value;
  } catch (e) {
    console.warn(`Failed to fetch SSM parameter ${name}`, e);
    return undefined;
  }
}

export default async () => {
  const isLocal = process.env.ENV === 'local';
  const awsConfig = isLocal
    ? {
        endpoint: 'http://localhost:4566',
        region: 'us-east-1',
        credentials: { accessKeyId: 'test', secretAccessKey: 'test' },
      }
    : {};

  const secretsClient = new SecretsManagerClient(awsConfig);
  const ssmClient = new SSMClient(awsConfig);

  // Database secrets
  const dbUrl = await getSecret(secretsClient, 'DATABASE_URL');
  const dbReplica1 = await getSecret(secretsClient, 'DATABASE_URL_REPLICA_1');
  const dbReplica2 = await getSecret(secretsClient, 'DATABASE_URL_REPLICA_2');

  return {
    port: parseInt(process.env.PORT || '3000', 10),
    env: process.env.ENV || 'development',
    database: {
      url: dbUrl,
      replica1Url: dbReplica1,
      replica2Url: dbReplica2,
    },
  };
};
