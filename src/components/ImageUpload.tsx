'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import NextImage from 'next/image'
import { Loader2, Upload, Camera, Image as ImageIcon, CheckCircle, AlertCircle } from 'lucide-react'

type Props = {
  userId: string
  isGuest?: boolean
  onUploadComplete?: (url: string) => void
}

export default function ImageUpload({ userId, isGuest = false, onUploadComplete }: Props) {
  const supabase = createClientComponentClient()
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [uploadedUrl, setUploadedUrl] = useState<string | null>(null)
  const [dragOver, setDragOver] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const fileInputRef = useRef<HTMLInputElement>(null)

  

  function processFile(file: File | null) {
    setError(null)
    setUploadedUrl(null)
    if (!file) return
    if (!file.type.startsWith('image/')) return setError('Please select a valid image file')
    if (file.size > 10 * 1024 * 1024) return setError('File size must be less than 10MB')
    setFile(file)
    setPreview(URL.createObjectURL(file))
  }

  const uploadImage = useCallback(async (file: File) => {
    setLoading(true)
    setError(null)
    setUploadProgress(0)
    const progressInterval = setInterval(() => {
      setUploadProgress(prev => Math.min(prev + Math.random() * 15, 85))
    }, 200)
    const filePath = `${userId}/${Date.now()}_${file.name}`
    try {
      const { error: uploadError } = await supabase.storage
        .from('images')
        .upload(filePath, file, { upsert: false })
      if (uploadError) throw new Error(uploadError.message)
      clearInterval(progressInterval)
      setUploadProgress(100)
      setUploadedUrl(filePath)
      onUploadComplete?.(filePath)
    } catch (err: unknown) {
      clearInterval(progressInterval)
      const message = err instanceof Error ? err.message : String(err)
      setError(message || 'Upload failed')
    } finally {
      setLoading(false)
      setTimeout(() => setUploadProgress(0), 2000)
    }
  }, [supabase, userId, onUploadComplete])

  useEffect(() => {
    if (!file) return

    if (isGuest) {
      const reader = new FileReader()
      reader.onloadend = () => onUploadComplete?.(reader.result as string)
      reader.readAsDataURL(file)
    } else {
      uploadImage(file)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [file, isGuest])

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center">
        <div className="inline-flex items-center gap-3 bg-gradient-to-r from-emerald-500 to-cyan-500 border border-white/20 rounded-full px-6 py-3 mb-4 shadow-[0_0_25px_rgba(16,185,129,0.2)]">
          <Camera className="w-5 h-5 text-white" />
          <span className="text-white font-medium">Upload Image</span>
        </div>
        <p className="text-gray-300">Drag and drop or click to select your meal photo</p>
      </div>

      {/* Upload Area */}
      <div
        data-testid="drop-area"
        className={`relative border-2 border-dashed rounded-2xl p-8 text-center transition-all duration-300 cursor-pointer group ${
          dragOver
            ? 'border-cyan-400 bg-cyan-400/10 scale-105'
            : preview
            ? 'border-emerald-400/50 bg-emerald-500/10'
            : 'border-white/10 bg-white/5 hover:border-emerald-400/30 hover:bg-white/10'
        }`}
        onDrop={(e) => {
          e.preventDefault()
          setDragOver(false)
          const imageFile = Array.from(e.dataTransfer.files).find(f => f.type.startsWith('image/')) ?? null
          processFile(imageFile)
        }}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
        onDragLeave={(e) => { e.preventDefault(); setDragOver(false) }}
        onClick={() => fileInputRef.current?.click()}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={(e) => processFile(e.target.files?.[0] ?? null)}
          className="hidden"
          data-testid="file-input"
        />

        {preview ? (
          <div className="space-y-4">
            <div className="relative inline-block">
              <NextImage
                src={preview}
                alt="Preview"
                width={256}
                height={256}
                unoptimized
                className="max-w-full max-h-64 rounded-xl border border-white/10 shadow-lg object-contain"
              />
              <div className="absolute -top-3 -right-3 w-8 h-8 bg-gradient-to-br from-emerald-400 to-cyan-400 rounded-full flex items-center justify-center shadow-lg">
                <CheckCircle className="w-5 h-5 text-white" />
              </div>
            </div>
            <p className="text-emerald-300 font-medium">Image ready for analysis!</p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="w-20 h-20 bg-gradient-to-br from-emerald-400/20 to-cyan-400/20 rounded-3xl flex items-center justify-center mx-auto border border-white/10 group-hover:scale-110 transition-transform">
              {dragOver ? (
                <Upload className="w-10 h-10 text-cyan-400 animate-bounce" />
              ) : (
                <ImageIcon className="w-10 h-10 text-white/60" aria-hidden="true" />
              )}
            </div>
            <p className="text-white font-medium text-lg">Choose your food image</p>
            <p className="text-gray-400 text-sm">Supports JPG, PNG, WebP • Max 10MB</p>
          </div>
        )}
      </div>

      {/* Progress */}
      {loading && (
        <div className="space-y-3">
          <div className="flex items-center justify-center gap-2 text-gray-200">
            <Loader2 className="w-5 h-5 animate-spin text-emerald-400" />
            Uploading your meal...
          </div>
          <div className="bg-white/10 rounded-full h-3 overflow-hidden">
            <div className="h-full bg-gradient-to-r from-emerald-400 to-cyan-400 transition-all rounded-full" style={{ width: `${uploadProgress}%` }} />
          </div>
        </div>
      )}

      {/* Success / Error */}
      {uploadedUrl && !loading && (
        <div className="bg-emerald-500/10 border border-emerald-400/30 rounded-xl p-4 flex items-center gap-3">
          <CheckCircle className="w-6 h-6 text-emerald-400" />
          <p className="text-emerald-300">Upload successful! Ready to analyse.</p>
        </div>
      )}
      {error && (
        <div className="bg-red-500/10 border border-red-400/30 rounded-xl p-4 flex items-center gap-3">
          <AlertCircle className="w-6 h-6 text-red-400" />
          <p className="text-red-200">{error}</p>
        </div>
      )}
    </div>
  )
}
