import React, { useEffect, useState } from 'react'
import { X, CreditCard, Loader2, AlertCircle, Usb, CheckCircle2 } from 'lucide-react'
import { supabase } from '../../lib/supabase/supabaseClient'
import { useRfidSerial } from '../../hooks/useRfidSerial'

export type ScannerMode = 'lookup' | 'raw'

export interface ClassDataPayload {
  class_id: string
  class_name: string
  class_code: string
  class_color: string | null
  class_icon: string | null
  current_balance: number
  public_token: string
}

interface RFIDScannerDialogProps {
  isOpen: boolean
  onClose: () => void
  mode?: ScannerMode
  onSuccess?: (classData: ClassDataPayload) => void
  onRawSuccess?: (uid: string) => void
  footerActions?: React.ReactNode
}

export const RFIDScannerDialog: React.FC<RFIDScannerDialogProps> = ({
  isOpen,
  onClose,
  mode = 'lookup',
  onSuccess,
  onRawSuccess,
  footerActions
}) => {
  const { 
    isSupported, 
    status: serialStatus, 
    lastUid, 
    error: serialError, 
    connect, 
    resetConnection,
    clearScan
  } = useRfidSerial()

  const [lookupStatus, setLookupStatus] = useState<'idle' | 'scanning' | 'success' | 'error'>('idle')
  const [lookupError, setLookupError] = useState('')

  // Disconnect when dialog closes
  useEffect(() => {
    if (!isOpen) {
      setLookupStatus('idle')
      setLookupError('')
    } else {
      clearScan()
    }
  }, [isOpen, clearScan])

  // Handle successful scan from Web Serial
  useEffect(() => {
    if (serialStatus === 'card-detected' && lastUid) {
      if (mode === 'raw') {
        if (onRawSuccess) onRawSuccess(lastUid)
      } else {
        executeLookup(lastUid)
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [serialStatus, lastUid, mode])

  const executeLookup = async (rfidVal: string) => {
    if (lookupStatus === 'scanning') return
    setLookupStatus('scanning')
    setLookupError('')

    try {
      const { data, error } = await supabase.rpc('lookup_class_by_rfid', {
        p_rfid_uid: rfidVal
      })

      if (error) throw error

      if (data && data.length > 0) {
        const cardInfo = data[0]
        setLookupStatus('success')
        setTimeout(() => {
          if (onSuccess) {
            onSuccess({
              class_id: cardInfo.class_id,
              class_name: cardInfo.class_name,
              class_code: cardInfo.class_code,
              class_color: cardInfo.class_color,
              class_icon: cardInfo.class_icon,
              current_balance: Number(cardInfo.current_balance),
              public_token: cardInfo.public_token
            })
          }
          onClose()
        }, 800)
      } else {
        setLookupStatus('error')
        setLookupError('Kartu tidak dikenal atau dinonaktifkan')
      }
    } catch (err: any) {
      console.error('RFID lookup failed:', err)
      setLookupStatus('error')
      setLookupError(err.message || 'Gagal mengenali RFID')
    }
  }

  if (!isOpen) return null

  const isScanningMode = serialStatus === 'scanning' || serialStatus === 'card-detected'

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
          <div className={`mx-auto p-4 rounded-full w-16 h-16 flex items-center justify-center mb-4 transition-colors ${serialStatus === 'connected' || isScanningMode ? 'bg-primary-950 text-white' : 'bg-primary-100 text-primary-950'}`}>
            <CreditCard className="h-8 w-8" />
          </div>
          <h3 className="text-2xl font-extrabold text-primary-950">Tap Kartu RFID</h3>
          <p className="text-text-muted text-base mt-2">
            {mode === 'raw' ? 'Pindai kartu untuk didaftarkan ke kelas.' : 'Posisikan kartu RFID di atas sensor reader.'}
          </p>
        </div>

        {!isSupported && (
          <div className="bg-red-50 text-red-700 p-4 rounded-xl border border-red-200 text-sm font-bold flex items-center gap-2 text-left mb-4">
            <AlertCircle className="h-5 w-5 shrink-0" />
            <p>Browser Anda tidak mendukung Web Serial API. Gunakan Chrome, Edge, atau Opera.</p>
          </div>
        )}

        {/* Connection Area */}
        <div className="space-y-4">
          {serialStatus === 'disconnected' || serialStatus === 'error' ? (
            <div className="bg-background rounded-xl p-4 border border-border space-y-4">
              <p className="text-sm font-bold text-text-muted">Status Koneksi Alat: <span className="text-red-500">Terputus</span></p>
              {serialError && (
                <div className="text-xs text-red-600 bg-red-50 p-2 rounded-lg text-left">
                  {serialError}
                </div>
              )}
              <button
                onClick={connect}
                className="w-full flex items-center justify-center gap-2 py-3 bg-primary-950 text-white font-bold rounded-xl hover:bg-primary-900 transition-colors"
              >
                <Usb className="h-5 w-5" />
                Hubungkan Alat RFID
              </button>
            </div>
          ) : (
            <div className="bg-background rounded-xl p-6 border border-primary-200 shadow-inner flex flex-col items-center justify-center min-h-[120px] transition-all relative overflow-hidden">
              {serialStatus === 'connecting' && (
                <div className="flex flex-col items-center gap-2 text-primary-900 font-bold">
                  <Loader2 className="h-8 w-8 animate-spin" />
                  <span>Menghubungkan...</span>
                </div>
              )}
              
              {isScanningMode && lookupStatus !== 'scanning' && lookupStatus !== 'success' && (
                <div className="flex flex-col items-center gap-2 text-primary-950 font-bold">
                  <div className="relative">
                    <CreditCard className="h-10 w-10 text-primary-950 animate-pulse" />
                    <div className="absolute inset-0 bg-primary-500 rounded-full animate-ping opacity-20 scale-150"></div>
                  </div>
                  <span>Menunggu Kartu...</span>
                </div>
              )}

              {/* Status Display when Lookup Mode */}
              {mode === 'lookup' && (
                <div className="mt-4 w-full">
                  {lookupStatus === 'scanning' && (
                    <div className="flex items-center justify-center gap-2 text-primary-900 font-bold">
                      <Loader2 className="h-5 w-5 animate-spin" />
                      Mencari kelas...
                    </div>
                  )}
                  {lookupStatus === 'success' && (
                    <div className="flex items-center justify-center gap-2 text-income font-bold bg-green-50 px-4 py-2 rounded-xl">
                      <CheckCircle2 className="h-5 w-5" />
                      Berhasil Membuka Dompet...
                    </div>
                  )}
                  {lookupStatus === 'error' && (
                    <div className="flex items-start gap-2 text-red-600 font-bold text-sm bg-red-50 px-4 py-3 rounded-xl mt-2 text-left">
                      <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />
                      {lookupError}
                    </div>
                  )}
                </div>
              )}
              
              {/* Display Raw Mode Success (Usually instant unless it needs visual feedback) */}
              {mode === 'raw' && serialStatus === 'card-detected' && (
                <div className="flex flex-col items-center justify-center gap-2 text-income font-bold bg-green-50 px-4 py-2 rounded-xl mt-4 w-full">
                  <CheckCircle2 className="h-5 w-5" />
                  <span>UID: {lastUid}</span>
                </div>
              )}
            </div>
          )}
          
          {(serialStatus === 'error' || lookupStatus === 'error' || serialStatus === 'disconnected') && (
            <button
              onClick={resetConnection}
              className="w-full py-2 text-xs font-bold text-red-600 border border-red-200 rounded-xl hover:bg-red-50 transition-colors"
            >
              Reset Paksa Koneksi
            </button>
          )}
        </div>

        {footerActions && (
          <div className="mt-6 pt-6 border-t border-border w-full flex flex-col gap-3">
            {footerActions}
          </div>
        )}
      </div>
    </div>
  )
}
