import React, { useEffect, useRef, useState } from 'react'
import { X, CreditCard, Loader2, AlertCircle } from 'lucide-react'
import { supabase } from '../../lib/supabase/supabaseClient'

interface RFIDScannerDialogProps {
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

export const RFIDScannerDialog: React.FC<RFIDScannerDialogProps> = ({
  isOpen,
  onClose,
  onSuccess
}) => {
  const [rfidInput, setRfidInput] = useState('')
  const [status, setStatus] = useState<'idle' | 'scanning' | 'success' | 'error'>('idle')
  const [errorMessage, setErrorMessage] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  // Force focus to input when open
  useEffect(() => {
    if (isOpen) {
      setStatus('idle')
      setRfidInput('')
      setErrorMessage('')
      
      const timer = setTimeout(() => {
        inputRef.current?.focus()
      }, 300)

      // Handle clicking anywhere in dialog to refocus
      const handleFocusClick = () => {
        inputRef.current?.focus()
      }
      document.addEventListener('click', handleFocusClick)

      return () => {
        clearTimeout(timer)
        document.removeEventListener('click', handleFocusClick)
      }
    }
  }, [isOpen])

  // Auto-submit when typing stops (150ms debounce)
  useEffect(() => {
    if (!isOpen || !rfidInput.trim()) return

    const timer = setTimeout(() => {
      executeLookup(rfidInput.trim())
    }, 150)

    return () => clearTimeout(timer)
  }, [rfidInput, isOpen])

  if (!isOpen) return null

  const executeLookup = async (rfidVal: string) => {
    if (!rfidVal || status === 'scanning') return
    setStatus('scanning')
    setErrorMessage('')

    try {
      const { data, error } = await supabase.rpc('lookup_class_by_rfid', {
        p_rfid_uid: rfidVal
      })

      if (error) throw error

      if (data && data.length > 0) {
        const cardInfo = data[0]
        setStatus('success')
        setTimeout(() => {
          onSuccess({
            class_id: cardInfo.class_id,
            class_name: cardInfo.class_name,
            class_code: cardInfo.class_code,
            class_color: cardInfo.class_color,
            class_icon: cardInfo.class_icon,
            current_balance: Number(cardInfo.current_balance),
            public_token: cardInfo.public_token
          })
          onClose()
        }, 800)
      } else {
        setStatus('error')
        setErrorMessage('Kartu tidak dikenal atau dinonaktifkan')
        setRfidInput('')
        setTimeout(() => {
          inputRef.current?.focus()
        }, 100)
      }
    } catch (err: any) {
      console.error('RFID lookup failed:', err)
      setStatus('error')
      setErrorMessage(err.message || 'Gagal mengenali RFID')
      setRfidInput('')
      setTimeout(() => {
        inputRef.current?.focus()
      }, 100)
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (rfidInput.trim()) {
      executeLookup(rfidInput.trim())
    }
  }

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
        <div className="mt-4 mb-6">
          <div className="mx-auto bg-primary-100 text-primary-950 p-4 rounded-full w-16 h-16 flex items-center justify-center mb-4">
            <CreditCard className="h-8 w-8" />
          </div>
          <h3 className="text-2xl font-extrabold text-primary-950">Tap Kartu RFID</h3>
          <p className="text-text-muted text-base mt-2">
            Posisikan kartu RFID di atas sensor reader
          </p>
        </div>

        {/* Form capture */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            ref={inputRef}
            type="text"
            value={rfidInput}
            onChange={(e) => setRfidInput(e.target.value)}
            placeholder="Menunggu kartu..."
            className="w-full text-center px-4 py-3 rounded-xl border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary-700 text-xl font-bold tracking-widest text-primary-950"
            autoComplete="off"
          />

          {/* Status Display */}
          <div className="min-h-[50px] flex items-center justify-center">
            {status === 'scanning' && (
              <div className="flex items-center gap-2 text-primary-900 font-semibold text-lg">
                <Loader2 className="h-5 w-5 animate-spin" />
                Mencari kelas...
              </div>
            )}
            {status === 'success' && (
              <div className="text-income font-bold text-lg">
                &bull; Kartu Ditemukan! Membuka Wallet...
              </div>
            )}
            {status === 'error' && (
              <div className="flex items-center gap-2 text-red-600 font-bold text-base bg-red-50 px-4 py-2 rounded-xl">
                <AlertCircle className="h-5 w-5 shrink-0" />
                {errorMessage}
              </div>
            )}
            {status === 'idle' && (
              <p className="text-sm text-text-muted">
                Reader akan otomatis mendeteksi ketika kartu ditempel
              </p>
            )}
          </div>
        </form>
      </div>
    </div>
  )
}
