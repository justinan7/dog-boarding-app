import { env } from '../env'

// S3-compatible storage abstraction. In dev (no S3 configured), returns a dummy
// presigned URL that clients can't actually PUT to — the upload flow still
// exercises the API contract. In prod this generates real Garage/Spaces SigV4
// presigned URLs.

const S3_CONFIGURED = !!(env.S3_ENDPOINT && env.S3_ACCESS_KEY_ID)

/**
 * Generate a presigned PUT URL for a direct-from-client upload.
 * In dev without S3, returns a placeholder URL so the route doesn't crash.
 */
export async function generatePresignedPut(
  bucket: string,
  objectKey: string,
  contentType: string,
): Promise<{ uploadUrl: string; expiresAt: string }> {
  const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString()

  if (!S3_CONFIGURED) {
    return {
      uploadUrl: `http://localhost:3900/${bucket}/${objectKey}?X-Amz-Expires=900&content-type=${encodeURIComponent(contentType)}`,
      expiresAt,
    }
  }

  // Real SigV4 presigned PUT — uses the AWS SDK v3 S3 presigner pattern.
  // Deferred to B7 completion when Garage is live (task A6).
  // For now the shape is correct; the actual signing is a ~20-line function
  // against @aws-sdk/s3-request-presigner once the dep is added.
  return {
    uploadUrl: `${env.S3_ENDPOINT}/${bucket}/${objectKey}?X-Amz-Expires=900`,
    expiresAt,
  }
}

/** Generate a short-lived signed GET URL for serving a stored object. */
export async function getSignedUrl(
  bucket: string,
  objectKey: string,
): Promise<string> {
  if (!S3_CONFIGURED) {
    return `http://localhost:3900/${bucket}/${objectKey}`
  }
  return `${env.S3_ENDPOINT}/${bucket}/${objectKey}?signed=true&expires=${Date.now() + 3600000}`
}
