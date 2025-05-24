'use client'

import { useState, useEffect } from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { Loader2 } from 'lucide-react'

type Props = {
  userId: string
  onUploadComplete?: (url: string) => void
}

export default function ImageUpload({ userId, onUploadComplete }: Props) {
  const supabase = createClientComponentClient()
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [uploadedUrl, setUploadedUrl] = useState<string | null>(null)

  useEffect(() => {
    if (file) {
      uploadImage(file)
    }
  }, [file])

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const selected = e.target.files?.[0] ?? null
    setError(null)
    setUploadedUrl(null)

    if (selected) {
      setFile(selected)
      setPreview(URL.createObjectURL(selected))
    } else {
      setFile(null)
      setPreview(null)
    }
  }

  async function uploadImage(file: File) {
    setLoading(true)
    setError(null)

    const filePath = `${userId}/${Date.now()}_${file.name}`

    const { error: uploadError } = await supabase.storage
      .from('images')
      .upload(filePath, file, { upsert: false })

    if (uploadError) {
      setError(`Upload failed: ${uploadError.message}`)
      setLoading(false)
      return
    }

    const { data, error: urlError } = await supabase
      .storage
      .from('images')
      .createSignedUrl(filePath, 60 * 5)

    setLoading(false)

    if (urlError || !data?.signedUrl) {
      setError('Failed to generate image URL.')
      return
    }

    setUploadedUrl(data.signedUrl)
    onUploadComplete?.(data.signedUrl)
  }

  return (
    <div className="bg-white rounded-2xl shadow-lg p-6 max-w-md mx-auto space-y-4">
      <label className="block">
        <span className="block text-sm font-medium text-gray-700 mb-2">Upload an image</span>
        <input
          type="file"
          accept="image/*"
          onChange={handleFileChange}
          className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4
            file:rounded-full file:border-0
            file:text-sm file:font-semibold
            file:bg-blue-600 file:text-white
            hover:file:bg-blue-700 cursor-pointer"
        />
      </label>

      {preview && (
        <div className="rounded-lg overflow-hidden border mt-4">
          <img src={preview} alt="Preview" className="w-full object-cover max-h-64" />
        </div>
      )}

      {loading && (
        <div className="flex items-center justify-center text-blue-600 mt-4">
          <Loader2 className="animate-spin h-6 w-6 mr-2" />
          Uploading...
        </div>
      )}

      {uploadedUrl && (
        <div className="text-green-600 font-medium text-center">
          ✅ Image uploaded successfully!
        </div>
      )}

      {error && (
        <p className="text-red-600 text-sm mt-2 text-center">{error}</p>
      )}
    </div>
  )
}
