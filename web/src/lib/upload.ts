// Media uploads (ADR-013): the file POSTs straight to the API, which
// normalizes photos with sharp and stores them (disk in dev, Garage in prod).

export interface UploadedMedia {
  objectKey: string
  thumbKey: string | null
  width?: number
  height?: number
}

export async function uploadMedia(file: File | Blob, kind: 'photo' | 'document' = 'photo'): Promise<UploadedMedia> {
  const res = await fetch(`/api/v1/media?kind=${kind}`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': file.type || 'application/octet-stream' },
    body: file,
  })
  if (!res.ok) {
    const body = await res.json().catch(() => null) as { error?: { message?: string }; message?: string } | null
    throw new Error(body?.error?.message ?? body?.message ?? `Upload failed (${res.status})`)
  }
  return res.json() as Promise<UploadedMedia>
}

/** Same-origin URL for a stored object (session cookie rides along on <img>). */
export const mediaUrl = (key: string) => `/api/v1/media/${key}`

/** Open the OS photo picker / camera and resolve with the chosen file. */
export function pickFile(accept: string): Promise<File | null> {
  return new Promise((resolve) => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = accept
    input.onchange = () => resolve(input.files?.[0] ?? null)
    // iOS Safari needs the input in the DOM for the picker to open reliably.
    input.style.display = 'none'
    document.body.appendChild(input)
    input.click()
    // cancel: no reliable event — resolve(null) via focus hack is flaky; the
    // promise simply never resolves on cancel, which is harmless for our uses.
    setTimeout(() => input.remove(), 60_000)
  })
}
