import React, { useEffect, useRef, useState } from 'react'
import { X, Camera, Loader2, AlertCircle } from 'lucide-react'
import { Html5Qrcode } from 'html5-qrcode'
import { supabase } from '../../lib/supabase/supabaseClient'

interface QRCodeScannerDialogProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: (classData: {
    class_id: string
    class_name: string
    class_code: string
    class_color: string | null
    class_icon: string | null
    current_balance: number
    public_token: string
  }) => void
}

export const QRCodeScannerDialog: React.FC<QRCodeScannerDialogProps> = ({
  isOpen,
  onClose,
  onSuccess
}) => {
  const [status, setStatus] = useState<'idle' | 'scanning' | 'searching' | 'success' | 'error'>('idle')
  const [errorMessage, setErrorMessage] = useState('')
  const html5QrcodeRef = useRef<Html5Qrcode | null>(null)
  const scannerId = 'qr-reader-element'

  useEffect(() => {
    if (isOpen) {
      setStatus('scanning')
      setErrorMessage('')
      
      // Delay initialization slightly to let the modal animate and DOM element mount
      const timer = setTimeout(() => {
        initializeScanner()
      }, 300)

      return () => {
        clearTimeout(timer)
        stopScanner()
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen])

  const initializeScanner = async () => {
    try {
      const html5Qrcode = new Html5Qrcode(scannerId)
      html5QrcodeRef.current = html5Qrcode

      await html5Qrcode.start(
        { facingMode: 'environment' },
        {
          fps: 10,
          qrbox: (width, height) => {
            const size = Math.min(width, height) * 0.7
            return { width: size, height: size }
          }
        },
        onScanSuccess,
        onScanFailure
      )
    } catch (err: any) {
      console.error('Failed to start QR scanner:', err)
      setStatus('error')
      setErrorMessage('Kamera tidak dapat diakses atau tidak ada camera.')
    }
  }

  const stopScanner = async () => {
    if (html5QrcodeRef.current && html5QrcodeRef.current.isScanning) {
      try {
        await html5QrcodeRef.current.stop()
      } catch (err) {
        console.error('Failed to stop QR scanner:', err)
      }
    }
  }

  const onScanSuccess = async (decodedText: string) => {
    // Stop scanning once successful
    await stopScanner()
    setStatus('searching')

    let token = decodedText.trim()

    // Handle full URL pattern: http://...#/wallet/TOKEN or /wallet/TOKEN
    if (token.includes('/wallet/')) {
      const parts = token.split('/wallet/')
      token = parts[parts.length - 1].split('?')[0].trim()
    }

    try {
      // First, try looking up class cards by token (QR Token)
      const { data: qrData, error: qrError } = await supabase.rpc('lookup_class_by_qr', {
        p_qr_token: token
      })

      if (qrError) throw qrError

      if (qrData && qrData.length > 0) {
        handleSuccess(qrData[0])
        return
      }

      // Second, fallback: maybe the token itself IS the public_token
      const { data: classData, error: classError } = await supabase
        .from('classes')
        .select('*')
        .eq('public_token', token)
        .eq('is_active', true)
        .maybeSingle()

      if (classError) throw classError

      if (classData) {
        handleSuccess({
          class_id: classData.id,
          class_name: classData.name,
          class_code: classData.code,
          class_color: classData.color,
          class_icon: classData.icon,
          current_balance: classData.current_balance,
          public_token: classData.public_token
        })
      } else {
        setStatus('error')
        setErrorMessage('QR Code tidak valid atau dinonaktifkan')
      }
    } catch (err: any) {
      console.error('QR lookup failed:', err)
      setStatus('error')
      setErrorMessage('Gagal memverifikasi QR Code')
    }
  }

  const handleSuccess = (classInfo: any) => {
    setStatus('success')
    setTimeout(() => {
      onSuccess({
        class_id: classInfo.class_id || classInfo.id,
        class_name: classInfo.class_name || classInfo.name,
        class_code: classInfo.class_code || classInfo.code,
        class_color: classInfo.class_color || classInfo.color,
        class_icon: classInfo.class_icon || classInfo.icon,
        current_balance: Number(classInfo.current_balance),
        public_token: classInfo.public_token
      })
      onClose()
    }, 800)
  }

  const onScanFailure = (_error: string) => {
    // Suppress spamming failure logs since html5-qrcode calls this on every frame without a match
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
      <div className="relative w-full max-w-md bg-surface rounded-2xl-card shadow-2xl overflow-hidden border border-border p-6 text-center">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-xl text-text-muted hover:bg-primary-50 hover:text-primary-950 transition-colors border border-transparent"
        >
          <X className="h-6 w-6" />
        </button>

        {/* Title */}
        <div className="mt-4 mb-4">
          <div className="mx-auto bg-primary-100 text-primary-950 p-4 rounded-full w-16 h-16 flex items-center justify-center mb-4">
            <Camera className="h-8 w-8" />
          </div>
          <h3 className="text-2xl font-extrabold text-primary-950">Scan QR Code</h3>
          <p className="text-text-muted text-base mt-2">
            Arahkan QR Code kelas ke dalam kotak kamera
          </p>
        </div>

        {/* Scanner Viewport */}
        <div className="relative w-full aspect-square max-w-[280px] mx-auto rounded-xl overflow-hidden border-2 border-primary-700 bg-black flex items-center justify-center">
          <div id={scannerId} className="w-full h-full" />
          
          {/* Scanning animation overlays */}
          {status === 'scanning' && (
            <div className="absolute inset-x-0 top-0 h-1.5 bg-primary-700/80 animate-bounce z-10" />
          )}
        </div>

        {/* Status display */}
        <div className="mt-4 min-h-[44px] flex items-center justify-center">
          {status === 'searching' && (
            <div className="flex items-center gap-2 text-primary-900 font-semibold text-lg">
              <Loader2 className="h-5 w-5 animate-spin" />
              Mencari kelas...
            </div>
          )}
          {status === 'success' && (
            <div className="text-income font-bold text-lg">
              &bull; QR Terbaca! Membuka Wallet...
            </div>
          )}
          {status === 'error' && (
            <div className="flex flex-col items-center gap-2">
              <div className="flex items-center gap-2 text-red-600 font-bold text-base bg-red-50 px-4 py-2 rounded-xl">
                <AlertCircle className="h-5 w-5 shrink-0" />
                {errorMessage}
              </div>
              <button 
                onClick={() => {
                  setStatus('scanning')
                  setErrorMessage('')
                  initializeScanner()
                }}
                className="text-sm text-primary-700 hover:text-primary-950 font-bold underline mt-1"
              >
                Coba Lagi
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
