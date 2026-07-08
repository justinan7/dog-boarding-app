import sharp from 'sharp'
import { log } from '../lib/log'

// HEIC→JPEG + thumbnail generation. Called by the pg-boss worker when a client
// finishes uploading to S3. In prod the input/output are S3 objects; here the
// function is pure (buffer in → buffers out) so it's testable without S3.
//
// IMPORTANT: sharp's prebuilt npm binary does NOT decode iPhone HEIC unless the
// host has libvips compiled with libheif+libde265. The NixOS Docker image in
// infra/ provides this. In local dev without it, HEIC files will throw — the
// caller should catch and re-queue or alert.

const THUMB_WIDTH = 400
const JPEG_QUALITY = 82

export interface ProcessedMedia {
  jpeg: Buffer
  thumb: Buffer
  width: number
  height: number
}

/** Convert an input image buffer (JPEG/PNG/HEIC/AVIF) to a canonical JPEG + thumbnail. */
export async function processImage(input: Buffer): Promise<ProcessedMedia> {
  const image = sharp(input)
  const meta = await image.metadata()
  const width = meta.width ?? 0
  const height = meta.height ?? 0

  log.debug({ width, height, format: meta.format }, 'processing image')

  const jpeg = await image
    .rotate() // auto-orient from EXIF
    .jpeg({ quality: JPEG_QUALITY, mozjpeg: true })
    .toBuffer()

  const thumb = await sharp(input)
    .rotate()
    .resize(THUMB_WIDTH, undefined, { withoutEnlargement: true })
    .jpeg({ quality: 70, mozjpeg: true })
    .toBuffer()

  return { jpeg, thumb, width, height }
}
