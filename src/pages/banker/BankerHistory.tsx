import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase/supabaseClient'
import { useAuth } from '../../app/providers/AuthProvider'
import { formatLM } from '../../lib/formatters/formatters'
import { 
  Loader2, 
  X, 
  AlertTriangle, 
  HelpCircle
} from 'lucide-react'
import { toast } from 'sonner'

interface BankerTx {
  id: string
  transaction_number: string
  class_id: string
  direction: 'income' | 'expense'
  transaction_type: string
  amount: number
  description: string | null
  status: 'completed' | 'cancelled'
  created_at: string
  cancellation_reason: string | null
  class: { name: string }
}

export const BankerHistory: React.FC = () => {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const [selectedTx, setSelectedTx] = useState<BankerTx | null>(null)
  const [cancelOpen, setCancelOpen] = useState(false)
  const [cancelReason, setCancelReason] = useState('')

  // 1. Fetch App settings (to verify banker_can_cancel parameter)
  const { data: appSettings } = useQuery({
    queryKey: ['appSettingsForBanker'],
    queryFn: async () => {
      const { data, error } = await supabase.from('app_settings').select('banker_can_cancel').limit(1).maybeSingle()
      if (error) throw error
      return data
    }
  })

  // 2. Fetch Transactions created by this Banker
  const { data: transactions = [], isLoading } = useQuery<BankerTx[]>({
    queryKey: ['bankerTransactionsHistory', user?.id],
    queryFn: async () => {
      if (!user) return []
      
      const { data, error } = await supabase
        .from('transactions')
        .select(`
          *,
          class:classes(name)
        `)
        .eq('created_by', user.id)
        .order('created_at', { ascending: false })
      
      if (error) throw error
      return data.map((t: any) => ({
        ...t,
        amount: Number(t.amount),
        class: t.class ? { name: t.class.name } : { name: 'Unknown' }
      }))
    },
    enabled: !!user
  })

  // Cancel transaction mutation
  const cancelMutation = useMutation({
    mutationFn: async ({ txId, reason }: { txId: string, reason: string }) => {
      const { data, error } = await supabase.rpc('cancel_lm_transaction', {
        p_transaction_id: txId,
        p_reason: reason
      })
      if (error) throw error
      return data
    },
    onSuccess: () => {
      toast.success('Transaksi berhasil dibatalkan!')
      queryClient.invalidateQueries({ queryKey: ['bankerTransactionsHistory'] })
      queryClient.invalidateQueries({ queryKey: ['bankerTodayStats'] })
      queryClient.invalidateQueries({ queryKey: ['bankerClassesSummary'] })
      setCancelOpen(false)
      setSelectedTx(null)
      setCancelReason('')
    },
    onError: (err: any) => {
      toast.error(err.message || 'Gagal membatalkan transaksi')
    }
  })

  const handleCancelSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedTx || !cancelReason.trim()) {
      toast.error('Alasan pembatalan harus diisi!')
      return
    }
    cancelMutation.mutate({
      txId: selectedTx.id,
      reason: cancelReason.trim()
    })
  }

  const getTxTypeBadge = (type: string) => {
    switch (type) {
      case 'initial_balance': return 'Saldo Awal'
      case 'mission_reward': return 'Reward Misi'
      case 'job_reward': return 'Gaji Job'
      case 'purchase': return 'Belanja'
      case 'rental': return 'Sewa'
      case 'bonus': return 'Bonus'
      case 'penalty': return 'Denda'
      case 'adjustment_add':
      case 'adjustment_subtract': return 'Koreksi'
      case 'refund': return 'Refund'
      default: return 'Transaksi'
    }
  }

  const canCancel = appSettings?.banker_can_cancel ?? true

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-black text-primary-950">Riwayat Catatan Anda</h2>
        <p className="text-text-muted text-sm mt-1">Daftar seluruh transaksi yang Anda layani beserta status pembatalannya</p>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center p-12 bg-surface rounded-2xl-card border border-border">
          <Loader2 className="h-8 w-8 animate-spin text-primary-900" />
        </div>
      ) : (
        <div className="space-y-4">
          {transactions.length === 0 ? (
            <div className="bg-surface border border-border p-12 text-center rounded-2xl-card max-w-sm mx-auto space-y-3">
              <HelpCircle className="h-10 w-10 text-text-muted mx-auto" />
              <p className="text-lg font-bold text-primary-950">Tidak Ada Riwayat</p>
              <p className="text-sm text-text-muted">Anda belum mencatatkan transaksi apapun saat ini.</p>
            </div>
          ) : (
            <div className="bg-surface rounded-2xl-card border border-border shadow-xs overflow-hidden">
              {/* Desktop Table View */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-primary-50/50 border-b border-border text-primary-950 font-bold text-xs">
                      <th className="p-4 w-32 font-mono">No. Transaksi</th>
                      <th className="p-4">Waktu</th>
                      <th className="p-4">Kelas</th>
                      <th className="p-4">Tipe</th>
                      <th className="p-4">Keterangan</th>
                      <th className="p-4 text-right">Nominal</th>
                      <th className="p-4 text-center">Status</th>
                      <th className="p-4 text-center">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border text-base">
                    {transactions.map((tx) => (
                      <tr key={tx.id} className={`hover:bg-primary-50/10 ${tx.status === 'cancelled' ? 'bg-red-50/10 opacity-75' : ''}`}>
                        <td className="p-4 font-mono font-bold text-primary-950">{tx.transaction_number}</td>
                        <td className="p-4 text-sm text-text-muted">
                          {new Date(tx.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })} &bull; {new Date(tx.created_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                        </td>
                        <td className="p-4 font-extrabold text-primary-950">{tx.class.name}</td>
                        <td className="p-4 font-semibold text-primary-850">{getTxTypeBadge(tx.transaction_type)}</td>
                        <td className="p-4 text-sm max-w-xs truncate text-primary-950" title={tx.description || ''}>{tx.description || '-'}</td>
                        <td className={`p-4 text-right font-black ${
                          tx.status === 'cancelled' 
                            ? 'text-text-muted line-through' 
                            : (tx.direction === 'income' ? 'text-income' : 'text-expense')
                        }`}>
                          {tx.status === 'cancelled' ? '' : (tx.direction === 'income' ? '+' : '-')}{formatLM(tx.amount)}
                        </td>
                        <td className="p-4 text-center">
                          <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full uppercase border ${
                            tx.status === 'completed' 
                              ? 'bg-green-50 text-income border-green-200' 
                              : 'bg-red-50 text-red-650 border-red-200'
                          }`}>
                            {tx.status}
                          </span>
                        </td>
                        <td className="p-4 text-center">
                          {tx.status === 'completed' && canCancel ? (
                            <button
                              onClick={() => {
                                setSelectedTx(tx)
                                setCancelReason('')
                                setCancelOpen(true)
                              }}
                              className="px-3 py-1.5 rounded-xl border border-red-200 text-red-650 font-bold text-xs hover:bg-red-50 transition-colors"
                            >
                              Batalkan
                            </button>
                          ) : (
                            <span className="text-xs text-text-muted font-medium">-</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile View */}
              <div className="md:hidden divide-y divide-border">
                {transactions.map((tx) => (
                  <div key={tx.id} className={`p-4 space-y-3 ${tx.status === 'cancelled' ? 'bg-red-50/10 opacity-75' : ''}`}>
                    <div className="flex justify-between items-start">
                      <div>
                        <span className="text-[10px] font-mono text-text-muted">{tx.transaction_number}</span>
                        <h4 className="text-base font-black text-primary-950 mt-1">{tx.class.name} &bull; {getTxTypeBadge(tx.transaction_type)}</h4>
                        <span className="text-[10px] text-text-muted block mt-0.5">
                          {new Date(tx.created_at).toLocaleDateString('id-ID')} &bull; {new Date(tx.created_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <div className="text-right">
                        <span className={`text-base font-black ${
                          tx.status === 'cancelled' 
                            ? 'text-text-muted line-through' 
                            : (tx.direction === 'income' ? 'text-income' : 'text-expense')
                        }`}>
                          {tx.status === 'cancelled' ? '' : (tx.direction === 'income' ? '+' : '-')}{formatLM(tx.amount)}
                        </span>
                        <span className={`text-[10px] font-bold block mt-1 uppercase text-center border rounded-full px-2 py-0.5 ${
                          tx.status === 'completed' 
                            ? 'bg-green-50 text-income border-green-200' 
                            : 'bg-red-50 text-red-650 border-red-200'
                        }`}>
                          {tx.status}
                        </span>
                      </div>
                    </div>

                    <div className="bg-background p-3 rounded-xl border border-border text-xs text-text-muted">
                      <div className="font-semibold text-primary-950">{tx.description || '-'}</div>
                      {tx.status === 'cancelled' && (
                        <div className="text-red-650 font-bold border-t border-red-100 pt-1.5 mt-1.5">
                          Batal: "{tx.cancellation_reason}"
                        </div>
                      )}
                    </div>

                    {tx.status === 'completed' && canCancel && (
                      <button
                        onClick={() => {
                          setSelectedTx(tx)
                          setCancelReason('')
                          setCancelOpen(true)
                        }}
                        className="w-full py-2.5 rounded-xl border border-red-200 text-red-650 font-bold text-sm bg-red-50/20 hover:bg-red-50 transition-colors"
                      >
                        Batalkan Transaksi
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Cancel Confirmation Dialog */}
      {cancelOpen && selectedTx && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="relative w-full max-w-md bg-surface rounded-2xl-card shadow-2xl overflow-hidden border border-border p-6 text-center">
            <button 
              onClick={() => { setCancelOpen(false); setSelectedTx(null); }}
              className="absolute top-4 right-4 p-2 rounded-xl text-text-muted hover:bg-primary-50 transition-colors"
            >
              <X className="h-6 w-6" />
            </button>

            <div className="mx-auto bg-red-50 text-red-600 p-4 rounded-full w-14 h-14 flex items-center justify-center mb-4">
              <AlertTriangle className="h-7 w-7" />
            </div>

            <h3 className="text-2xl font-black text-primary-950">Batalkan Transaksi</h3>
            <p className="text-sm text-text-muted mt-2">
              Apakah Anda yakin ingin membatalkan transaksi <strong className="text-primary-950">{selectedTx.transaction_number}</strong> kelas <strong>{selectedTx.class.name}</strong> senilai <strong>{formatLM(selectedTx.amount)}</strong>?
            </p>

            <form onSubmit={handleCancelSubmit} className="mt-4 space-y-4 text-left">
              <div className="space-y-1.5">
                <label className="text-sm font-bold text-primary-950 block">Alasan Pembatalan (Wajib)</label>
                <textarea
                  required
                  rows={3}
                  value={cancelReason}
                  onChange={e => setCancelReason(e.target.value)}
                  placeholder="Koreksi salah belanja / dsb..."
                  className="w-full px-4 py-3 rounded-xl border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary-700 text-sm"
                  disabled={cancelMutation.isPending}
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => { setCancelOpen(false); setSelectedTx(null); }}
                  className="flex-1 py-3 px-4 bg-background border border-border text-primary-950 font-bold hover:bg-primary-50 rounded-xl transition-colors"
                  disabled={cancelMutation.isPending}
                >
                  Tutup
                </button>
                <button
                  type="submit"
                  className="flex-1 py-3 px-4 bg-red-650 text-white font-bold hover:bg-red-750 rounded-xl transition-all shadow-md flex items-center justify-center gap-2"
                  disabled={cancelMutation.isPending}
                >
                  {cancelMutation.isPending ? <Loader2 className="h-5 w-5 animate-spin" /> : 'Ya, Batalkan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
