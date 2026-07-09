import { mkdir, readFile, writeFile, access } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { env } from '../env'
import { log } from './log'

// Media storage driver (ADR-013): uploads flow THROUGH the API (sharp runs
// synchronously in-request), and this module abstracts where bytes land —
// local disk in dev (zero infra, works with PGlite), S3/Garage in prod.
// Right-sized for a two-person business; presigned direct-to-S3 can return
// if volume ever demands it.

export interface StoredObject {
  body: Buffer
  contentType: string
}

interface MediaStore {
  kind: 'local' | 's3'
  put(bucket: string, key: string, body: Buffer, contentType: string): Promise<void>
  get(bucket: string, key: string): Promise<StoredObject | null>
}

const EXT_MIME: Record<string, string> = {
  jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp',
  gif: 'image/gif', heic: 'image/heic', pdf: 'application/pdf', bin: 'application/octet-stream',
}

export function mimeForKey(key: string): string {
  const ext = key.split('.').pop()?.toLowerCase() ?? 'bin'
  return EXT_MIME[ext] ?? 'application/octet-stream'
}

// ---- local disk (dev) -------------------------------------------------------

function localStore(root: string): MediaStore {
  return {
    kind: 'local',
    async put(bucket, key, body) {
      const path = join(root, bucket, key)
      await mkdir(dirname(path), { recursive: true })
      await writeFile(path, body)
    },
    async get(bucket, key) {
      const path = join(root, bucket, key)
      try {
        await access(path)
      } catch {
        return null
      }
      return { body: await readFile(path), contentType: mimeForKey(key) }
    },
  }
}

// ---- S3 / Garage (prod) -----------------------------------------------------

function s3Store(): MediaStore {
  // Lazy import keeps the SDK out of dev startup.
  let clientPromise: Promise<import('@aws-sdk/client-s3').S3Client> | null = null
  const getClient = () => {
    clientPromise ??= import('@aws-sdk/client-s3').then(({ S3Client }) => new S3Client({
      endpoint: env.S3_ENDPOINT,
      region: env.S3_REGION,
      forcePathStyle: true, // Garage serves path-style buckets
      credentials: {
        accessKeyId: env.S3_ACCESS_KEY_ID!,
        secretAccessKey: env.S3_SECRET_ACCESS_KEY!,
      },
    }))
    return clientPromise
  }

  return {
    kind: 's3',
    async put(bucket, key, body, contentType) {
      const { PutObjectCommand } = await import('@aws-sdk/client-s3')
      await (await getClient()).send(new PutObjectCommand({
        Bucket: bucket, Key: key, Body: body, ContentType: contentType,
      }))
    },
    async get(bucket, key) {
      const { GetObjectCommand, NoSuchKey } = await import('@aws-sdk/client-s3')
      try {
        const res = await (await getClient()).send(new GetObjectCommand({ Bucket: bucket, Key: key }))
        const body = Buffer.from(await res.Body!.transformToByteArray())
        return { body, contentType: res.ContentType ?? mimeForKey(key) }
      } catch (err) {
        if (err instanceof NoSuchKey || (err as { name?: string }).name === 'NoSuchKey') return null
        throw err
      }
    },
  }
}

// ---- singleton ---------------------------------------------------------------

let store: MediaStore | null = null

export function getMediaStore(): MediaStore {
  if (store) return store
  const s3Configured = !!(env.S3_ENDPOINT && env.S3_ACCESS_KEY_ID && env.S3_SECRET_ACCESS_KEY)
  store = s3Configured ? s3Store() : localStore(env.MEDIA_DIR)
  log.info({ driver: store.kind }, 'media store initialized')
  return store
}

export const BUCKET_MEDIA = 'zoomez-media'
export const BUCKET_DOCS = 'zoomez-docs'
