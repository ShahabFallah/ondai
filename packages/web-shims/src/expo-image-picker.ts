// Browser stand-in for expo-image-picker: a hidden <input type="file">.
export enum MediaTypeOptions {
  All = 'All',
  Images = 'Images',
  Videos = 'Videos',
}
export interface ImagePickerAsset {
  uri: string
  width: number
  height: number
  fileName?: string
  mimeType?: string
  base64?: string
}
export interface ImagePickerResult {
  canceled: boolean
  assets: ImagePickerAsset[] | null
}
export interface ImagePickerOptions {
  mediaTypes?: MediaTypeOptions | string[]
  allowsEditing?: boolean
  quality?: number
  base64?: boolean
}

export async function requestMediaLibraryPermissionsAsync() {
  return { status: 'granted', granted: true, canAskAgain: true, expires: 'never' as const }
}
export async function requestCameraPermissionsAsync() {
  return { status: 'granted', granted: true, canAskAgain: true, expires: 'never' as const }
}

function pick(capture: boolean, options: ImagePickerOptions): Promise<ImagePickerResult> {
  return new Promise((resolve) => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = 'image/*'
    if (capture) input.setAttribute('capture', 'environment')
    input.style.display = 'none'
    document.body.appendChild(input)
    input.onchange = async () => {
      const file = input.files?.[0]
      document.body.removeChild(input)
      if (!file) return resolve({ canceled: true, assets: null })
      const uri = URL.createObjectURL(file)
      const dims = await new Promise<{ width: number; height: number }>((res) => {
        const img = new Image()
        img.onload = () => res({ width: img.naturalWidth, height: img.naturalHeight })
        img.onerror = () => res({ width: 0, height: 0 })
        img.src = uri
      })
      let base64: string | undefined
      if (options.base64) {
        base64 = await new Promise<string>((res) => {
          const r = new FileReader()
          r.onload = () => res(String(r.result).split(',')[1] ?? '')
          r.readAsDataURL(file)
        })
      }
      resolve({ canceled: false, assets: [{ uri, ...dims, fileName: file.name, mimeType: file.type, base64 }] })
    }
    input.click()
  })
}

export const launchImageLibraryAsync = (options: ImagePickerOptions = {}) => pick(false, options)
export const launchCameraAsync = (options: ImagePickerOptions = {}) => pick(true, options)
