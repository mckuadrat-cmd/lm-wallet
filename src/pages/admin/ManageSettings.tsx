import React, { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase/supabaseClient'
import { 
  Settings, 
  Loader2, 
  Save, 
  RefreshCw, 
  AlertTriangle
} from 'lucide-react'
import { toast } from 'sonner'

interface AppSettings {
  id: string
  app_name: string
  activity_name: string
  currency_name: string
  currency_code: string
  logo_url: string | null
  participant_message: string | null
  banker_can_cancel: boolean
  facilitator_pin: string
}

export const ManageSettings: React.FC = () => {
  const queryClient = useQueryClient()
  const [resetConfirmText, setResetConfirmText] = useState('')
  const [resetConfirmOpen, setResetConfirmOpen] = useState(false)
  const [resetLoading, setResetLoading] = useState(false)

  // Form states
  const [appName, setAppName] = useState('')
  const [activityName, setActivityName] = useState('')
  const [currencyName, setCurrencyName] = useState('Leadership Money')
  const [currencyCode, setCurrencyCode] = useState('LM')
  const [participantMessage, setParticipantMessage] = useState('')
  const [bankerCanCancel, setBankerCanCancel] = useState(true)
  const [facilitatorPin, setFacilitatorPin] = useState('')

  // Fetch settings
  const { data: settings, isLoading } = useQuery<AppSettings | null>({
    queryKey: ['adminAppSettings'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('app_settings')
        .select('*')
        .limit(1)
        .maybeSingle()
      
      if (error) throw error
      return data
    }
  })

  // Set values when loaded
  useEffect(() => {
    if (settings) {
      setAppName(settings.app_name)
      setActivityName(settings.activity_name)
      setCurrencyName(settings.currency_name || 'Leadership Money')
      setCurrencyCode(settings.currency_code || 'LM')
      setParticipantMessage(settings.participant_message || '')
      setBankerCanCancel(settings.banker_can_cancel)
      setFacilitatorPin(settings.facilitator_pin || '')
    }
  }, [settings])

  // Save Settings mutation
  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        app_name: appName.trim(),
        activity_name: activityName.trim(),
        currency_name: currencyName.trim(),
        currency_code: currencyCode.trim(),
        participant_message: participantMessage.trim() || null,
        banker_can_cancel: bankerCanCancel,
        facilitator_pin: facilitatorPin.trim()
      }

      const { error } = await supabase
        .from('app_settings')
        .update(payload)
        .eq('id', '00000000-0000-0000-0000-000000000000')
      
      if (error) throw error
    },
    onSuccess: () => {
      toast.success('Pengaturan aplikasi berhasil disimpan!')
      queryClient.invalidateQueries({ queryKey: ['adminAppSettings'] })
    },
    onError: (err: any) => {
      toast.error(err.message || 'Gagal menyimpan pengaturan')
    }
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!appName.trim() || !activityName.trim()) {
      toast.error('Nama Aplikasi dan Nama Kegiatan wajib diisi!')
      return
    }
    saveMutation.mutate()
  }

  // Activity Reset Function
  const handleResetData = async () => {
    if (resetConfirmText !== 'RESET DATA') {
      toast.error('Teks konfirmasi salah!')
      return
    }

    setResetLoading(true)
    try {
      // 1. Delete all transaction items
      const { error: err1 } = await supabase
        .from('transaction_items')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000')
      if (err1) throw err1

      // 2. Delete all balance adjustments
      const { error: err2 } = await supabase
        .from('balance_adjustments')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000')
      if (err2) throw err2

      // 3. Delete all transactions
      const { error: err3 } = await supabase
        .from('transactions')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000')
      if (err3) throw err3

      // 4. Reset class balances to initial values (1500 LM) and update timestamp
      // To ensure each class matches its initial balance
      const { data: classesList, error: clsErr } = await supabase.from('classes').select('id, initial_balance')
      if (clsErr) throw clsErr

      for (const cls of classesList) {
        const bal = Number(cls.initial_balance)
        await supabase
          .from('classes')
          .update({ current_balance: bal, updated_at: new Date().toISOString() })
          .eq('id', cls.id)
        
        // Write initial balance transaction entry
        await supabase
          .from('transactions')
          .insert({
            transaction_number: `TX-RESET-INIT-${cls.id.substring(0, 5)}`,
            class_id: cls.id,
            direction: 'income',
            transaction_type: 'initial_balance',
            amount: bal,
            description: 'Saldo Awal Kegiatan (Pasca Reset)',
            status: 'completed',
            balance_before: 0,
            balance_after: bal
          })
      }

      // 5. Reset class cards timestamps
      const { error: err5 } = await supabase
        .from('class_cards')
        .update({ last_used_at: null })
        .neq('id', '00000000-0000-0000-0000-000000000000')
      if (err5) throw err5

      toast.success('Seluruh data transaksi dan saldo kelas berhasil direset ke saldo awal!')
      queryClient.invalidateQueries()
      setResetConfirmOpen(false)
      setResetConfirmText('')
    } catch (err: any) {
      console.error(err)
      toast.error(err.message || 'Gagal melakukan reset data')
    } finally {
      setResetLoading(false)
    }
  }

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-3xl font-black text-primary-950">Pengaturan Kegiatan</h2>
        <p className="text-text-muted text-sm mt-1">Sesuaikan nama kegiatan, hak akses banker, dan kontrol database utama</p>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center p-12 bg-surface rounded-2xl-card border border-border">
          <Loader2 className="h-8 w-8 animate-spin text-primary-900" />
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main settings form */}
          <div className="lg:col-span-2 bg-surface rounded-2xl-card border border-border shadow-xs p-6 space-y-6">
            <h3 className="text-xl font-bold text-primary-950 border-b border-border/60 pb-3 flex items-center gap-2">
              <Settings className="h-5 w-5 text-primary-700" />
              Identitas Aplikasi & Kebijakan
            </h3>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-sm font-bold text-primary-950 block">Nama Aplikasi</label>
                  <input
                    type="text"
                    required
                    value={appName}
                    onChange={e => setAppName(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary-700"
                    disabled={saveMutation.isPending}
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-sm font-bold text-primary-950 block">Nama Kegiatan</label>
                  <input
                    type="text"
                    required
                    value={activityName}
                    onChange={e => setActivityName(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary-700"
                    disabled={saveMutation.isPending}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-sm font-bold text-primary-950 block">Nama Mata Uang</label>
                  <input
                    type="text"
                    value={currencyName}
                    onChange={e => setCurrencyName(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary-700 text-text-muted"
                    disabled={saveMutation.isPending}
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-sm font-bold text-primary-950 block">Kode Mata Uang</label>
                  <input
                    type="text"
                    value={currencyCode}
                    onChange={e => setCurrencyCode(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary-700 font-bold"
                    disabled={saveMutation.isPending}
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-bold text-primary-950 block">Pesan Sambutan Peserta (Halaman Wallet)</label>
                <textarea
                  rows={3}
                  value={participantMessage}
                  onChange={e => setParticipantMessage(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary-700 text-sm"
                  placeholder="Ketik pesan selamat datang..."
                  disabled={saveMutation.isPending}
                />
              </div>

              <div className="bg-primary-50/50 p-4 rounded-xl border border-primary-100 flex items-start gap-3">
                <input
                  type="checkbox"
                  id="bankerCanCancel"
                  checked={bankerCanCancel}
                  onChange={e => setBankerCanCancel(e.target.checked)}
                  className="h-5 w-5 accent-primary-700 mt-0.5 shrink-0"
                  disabled={saveMutation.isPending}
                />
                <div className="space-y-1">
                  <label htmlFor="bankerCanCancel" className="text-sm font-bold text-primary-950 block select-none">
                    Banker Dapat Membatalkan Transaksi
                  </label>
                  <span className="text-xs text-text-muted block leading-relaxed font-semibold">
                    Jika diaktifkan, Banker dapat membatalkan transaksi miliknya secara langsung dari dashboard mereka. Jika dinonaktifkan, pembatalan hanya bisa diajukan kepada Admin.
                  </span>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-bold text-primary-950 block">PIN Fasilitator (Untuk Akses Halaman Publik)</label>
                <input
                  type="text"
                  required
                  value={facilitatorPin}
                  onChange={e => setFacilitatorPin(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary-700 font-mono tracking-widest text-lg"
                  placeholder="Contoh: 123456"
                  disabled={saveMutation.isPending}
                />
              </div>

              <button
                type="submit"
                className="w-full sm:w-auto px-6 py-3.5 bg-primary-950 text-white font-bold hover:bg-primary-900 rounded-xl transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer"
                disabled={saveMutation.isPending}
              >
                {saveMutation.isPending ? <Loader2 className="h-5 w-5 animate-spin" /> : <Save className="h-5 w-5" />}
                Simpan Perubahan
              </button>
            </form>
          </div>

          {/* Reset operations console */}
          <div className="bg-surface rounded-2xl-card border border-border shadow-xs p-6 space-y-6">
            <h3 className="text-xl font-bold text-red-650 border-b border-border/60 pb-3 flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-600" />
              Reset & Hapus Data
            </h3>

            <div className="space-y-4">
              <div className="bg-red-50 text-red-700 p-4 rounded-xl border border-red-150 text-xs">
                <p className="font-bold mb-1 leading-tight">PERINGATAN KERAS:</p>
                <p className="leading-relaxed font-medium">
                  Aksi ini akan menghapus seluruh catatan transaksi, belanja barang, sewa perlengkapan, dan mengembalikan saldo seluruh kelas kembali ke nominal awal (1.500 LM). Tindakan ini tidak dapat dibatalkan!
                </p>
              </div>

              {resetConfirmOpen ? (
                <div className="space-y-3">
                  <p className="text-xs font-bold text-primary-950">
                    Ketik teks <span className="text-red-600">RESET DATA</span> di bawah untuk melanjutkan:
                  </p>
                  <input
                    type="text"
                    value={resetConfirmText}
                    onChange={e => setResetConfirmText(e.target.value)}
                    placeholder="RESET DATA"
                    className="w-full px-4 py-2.5 rounded-xl border border-red-200 bg-background focus:outline-none focus:ring-2 focus:ring-red-600 text-center font-black tracking-widest text-red-650"
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={() => { setResetConfirmOpen(false); setResetConfirmText(''); }}
                      className="flex-1 py-2 px-3 bg-background border border-border text-xs font-bold text-primary-950 rounded-xl"
                      disabled={resetLoading}
                    >
                      Batal
                    </button>
                    <button
                      onClick={handleResetData}
                      className="flex-1 py-2 px-3 bg-red-650 text-white text-xs font-bold rounded-xl hover:bg-red-700 transition-colors shadow-xs"
                      disabled={resetLoading || resetConfirmText !== 'RESET DATA'}
                    >
                      {resetLoading ? 'Mereset...' : 'Ya, Hapus Semua'}
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => setResetConfirmOpen(true)}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-red-50 text-red-700 font-bold hover:bg-red-100 rounded-xl transition-colors border border-red-200 cursor-pointer text-sm"
                >
                  <RefreshCw className="h-4.5 w-4.5" />
                  Reset Seluruh Data Kegiatan
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
