'use client'

import { useState, useEffect, useRef } from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { Loader2, Upload, Camera, Image, CheckCircle, AlertCircle } from 'lucide-react'

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
  const [dragOver, setDragOver] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (file) {
      uploadImage(file)
    }
  }, [file])

  function processFile(file: File | null) {
    setError(null);
    setUploadedUrl(null);

    if (!file) {
      setFile(null);
      setPreview(null);
      return;
    }

    if (!file.type.startsWith('image/')) {
      setError('Please select a valid image file');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setError('File size must be less than 10MB');
      return;
    }

    setFile(file);
    setPreview(URL.createObjectURL(file));
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] ?? null;
    processFile(file);
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);

    const files = Array.from(e.dataTransfer.files);
    const imageFile = files.find(f => f.type.startsWith('image/')) ?? null;
    processFile(imageFile); // ✅ this now works perfectly
  }

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault()
    setDragOver(true)
  }

  function handleDragLeave(e: React.DragEvent) {
    e.preventDefault()
    setDragOver(false)
  }

  async function uploadImage(file: File) {
    setLoading(true)
    setError(null)
    setUploadProgress(0)

    // Progress simulation for UI feedback
    const progressInterval = setInterval(() => {
      setUploadProgress(prev => Math.min(prev + Math.random() * 20, 90))
    }, 200)

    const filePath = `${userId}/${Date.now()}_${file.name}`

    try {
      const { error: uploadError } = await supabase.storage
        .from('images')
        .upload(filePath, file, { upsert: false })

      if (uploadError) {
        throw new Error(`Upload failed: ${uploadError.message}`)
      }

      clearInterval(progressInterval)
      setUploadProgress(100)
      setUploadedUrl(filePath)
      onUploadComplete?.(filePath)
      
    } catch (err: any) {
      clearInterval(progressInterval)
      setError(err.message || 'Upload failed')
    } finally {
      setLoading(false)
      setTimeout(() => setUploadProgress(0), 2000)
    }
  }

  return (
    <div className="space-y-6">
      {/* Upload Header */}
      <div className="text-center">
        <div className="inline-flex items-center gap-3 bg-white/10 backdrop-blur-md border border-white/20 rounded-full px-6 py-3 mb-4">
          <Camera className="w-5 h-5 text-purple-400" />
          <span className="text-white font-medium">Upload Image</span>
          <div className="w-2 h-2 bg-purple-400 rounded-full animate-pulse"></div>
        </div>
        <p className="text-white/70">Drag and drop or click to select your food photo</p>
      </div>

      {/* Upload Area */}
      <div
        className={`relative border-2 border-dashed rounded-2xl p-8 text-center transition-all duration-300 cursor-pointer group ${
          dragOver
            ? 'border-purple-400 bg-purple-500/10 scale-105'
            : preview
            ? 'border-emerald-400/50 bg-emerald-500/10'
            : 'border-white/30 bg-white/5 hover:border-purple-400/50 hover:bg-white/10'
        }`}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={() => fileInputRef.current?.click()}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileChange}
          className="hidden"
        />

        {preview ? (
          <div className="space-y-4">
            <div className="relative inline-block">
              <img
                src={preview}
                alt="Preview"
                className="max-w-full max-h-64 rounded-xl shadow-2xl border-2 border-white/20"
              />
              <div className="absolute -top-3 -right-3 w-8 h-8 bg-gradient-to-br from-emerald-400 to-teal-400 rounded-full flex items-center justify-center shadow-lg">
                <CheckCircle className="w-5 h-5 text-white" />
              </div>
            </div>
            <p className="text-emerald-300 font-medium">Image ready for analysis!</p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="w-20 h-20 bg-gradient-to-br from-purple-400/20 to-pink-400/20 rounded-3xl flex items-center justify-center mx-auto group-hover:scale-110 transition-transform duration-300 border border-white/10">
              {dragOver ? (
                <Upload className="w-10 h-10 text-purple-400 animate-bounce" />
              ) : (
                <Image className="w-10 h-10 text-white/60" />
              )}
            </div>
            
            <div>
              <p className="text-white font-medium text-lg mb-2">
                {dragOver ? 'Drop your image here!' : 'Choose your food image'}
              </p>
              <p className="text-white/60 text-sm">
                Supports JPG, PNG, WebP • Max 10MB
              </p>
            </div>

            <div className="inline-flex items-center gap-2 bg-purple-500/20 border border-purple-400/30 rounded-full px-4 py-2 text-purple-300 text-sm">
              <span>📱</span>
              <span>Works great with phone photos!</span>
            </div>
          </div>
        )}

        {/* Animated border effect */}
        <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-purple-400/20 via-pink-400/20 to-cyan-400/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300 -z-10 blur-xl"></div>
      </div>

      {/* Upload Progress */}
      {loading && (
        <div className="space-y-4">
          <div className="flex items-center justify-center gap-3 text-white">
            <div className="w-8 h-8 bg-gradient-to-br from-purple-400 to-pink-400 rounded-xl flex items-center justify-center shadow-lg">
              <Loader2 className="w-5 h-5 animate-spin text-white" />
            </div>
            <span className="font-medium">Uploading your delicious photo...</span>
          </div>
          
          {uploadProgress > 0 && (
            <div className="bg-white/10 rounded-full h-3 overflow-hidden backdrop-blur-sm border border-white/20">
              <div 
                className="h-full bg-gradient-to-r from-purple-400 via-pink-400 to-cyan-400 transition-all duration-300 ease-out rounded-full relative overflow-hidden"
                style={{ width: `${uploadProgress}%` }}
              >
                <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/30 to-white/0 animate-pulse"></div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Success Message */}
      {uploadedUrl && !loading && (
        <div className="bg-emerald-500/20 border border-emerald-400/30 rounded-xl p-4 backdrop-blur-sm">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-gradient-to-br from-emerald-400 to-teal-400 rounded-xl flex items-center justify-center shadow-lg">
              <CheckCircle className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-emerald-200 font-medium">Upload Successful!</p>
              <p className="text-emerald-300/80 text-sm">Ready to analyze your food image</p>
            </div>
          </div>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="bg-red-500/20 border border-red-400/30 rounded-xl p-4 backdrop-blur-sm">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-gradient-to-br from-red-400 to-red-500 rounded-xl flex items-center justify-center shadow-lg">
              <AlertCircle className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-red-200 font-medium">Upload Error</p>
              <p className="text-red-300/80 text-sm">{error}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}