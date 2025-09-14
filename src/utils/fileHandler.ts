export interface FileAttachment {
  id: string
  name: string
  type: string
  size: number
  data: string // base64 encoded (for preview)
  preview?: string // for images
  file_id?: string // Claude Files API ID
  uploading?: boolean // upload status
}

export const ALLOWED_FILE_TYPES = {
  images: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
  documents: ['application/pdf'],
}

export const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB

export function isAllowedFileType(type: string): boolean {
  return (
    ALLOWED_FILE_TYPES.images.includes(type) ||
    ALLOWED_FILE_TYPES.documents.includes(type)
  )
}

export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes'
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i]
}

export async function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.readAsDataURL(file)
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = (error) => reject(error)
  })
}

export async function processFile(file: File): Promise<FileAttachment | null> {
  if (!isAllowedFileType(file.type)) {
    throw new Error(`File type ${file.type} is not supported`)
  }

  if (file.size > MAX_FILE_SIZE) {
    throw new Error(`File size exceeds ${formatFileSize(MAX_FILE_SIZE)} limit`)
  }

  const base64Data = await fileToBase64(file)
  
  return {
    id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    name: file.name,
    type: file.type,
    size: file.size,
    data: base64Data,
    preview: ALLOWED_FILE_TYPES.images.includes(file.type) ? base64Data : undefined,
  }
}

export function getFileIcon(type: string): string {
  if (ALLOWED_FILE_TYPES.images.includes(type)) {
    return '🖼️'
  }
  if (type === 'application/pdf') {
    return '📄'
  }
  return '📎'
}