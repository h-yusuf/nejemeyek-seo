import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

export interface StorageConfig {
  endpoint: string;
  bucket: string;
  accessKey: string;
  secretKey: string;
}

function createClient(config: StorageConfig): S3Client {
  return new S3Client({
    endpoint: config.endpoint,
    region: 'us-east-1',
    credentials: {
      accessKeyId: config.accessKey,
      secretAccessKey: config.secretKey,
    },
    forcePathStyle: true,
  });
}

export async function getPresignedUploadUrl(
  config: StorageConfig,
  key: string,
  contentType: string,
): Promise<string> {
  const client = createClient(config);
  const command = new PutObjectCommand({
    Bucket: config.bucket,
    Key: key,
    ContentType: contentType,
  });
  return getSignedUrl(client, command, { expiresIn: 300 });
}

export function getPublicUrl(config: StorageConfig, key: string): string {
  return `${config.endpoint}/${config.bucket}/${key}`;
}

export async function deleteObject(config: StorageConfig, key: string): Promise<void> {
  const client = createClient(config);
  await client.send(new DeleteObjectCommand({ Bucket: config.bucket, Key: key }));
}

export function keyFromUrl(url: string, endpoint: string, bucket: string): string {
  return url.replace(`${endpoint}/${bucket}/`, '');
}
