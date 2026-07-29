import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase/supabaseClient'
import { formatLM } from '../../lib/formatters/formatters'
import { 
  Search, 
  X, 
  Trash2, 
  Edit, 
  Loader2, 
  AlertTriangle
} from 'lucide-react'
import { toast } from 'sonner'

interface TransactionItem {
  item_name: string
  item_type: string
  quantity: number
  unit: string
  unit_price: number
  subtotal: number
}

interface TransactionData {
  id: string
  transaction_number: string
  class_id: string
  direction: 'income' | 'expense'
  transaction_type: string
  amount: number
  description: string | null
  status: 'completed' | 'cancelled'
  balance_before: number
  balance_after: number
  created_at: string
  cancelled_at: string | null
  cancellation_reason: string | null
  edit_reason: string | null
  edited_at: string | null
  metadata: any
  class: { name: string }
  creator: { full_name: string | null; email: string } | null
  cancelled_by_user: { full_name: string | null } | null
  items: TransactionItem[]
}

export const ManageTransactions: React.FC = () => {
  const queryClient = useQueryClient()
  
  // Filtering states
  const [filterClass, setFilterClass] = useState('')
  const [filterType, setFilterType] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [searchQuery, setSearchQuery] = useState('')

  // Selected Tx and Dialog states
  const [selectedTx, setSelectedTx] = useState<TransactionData | null>(null)
  
  const [cancelOpen, setCancelOpen] = useState(false)
  const [cancelReason, setCancelReason] = useState('')

  const [editOpen, setEditOpen] = useState(false)
  const [newAmount, setNewAmount] = useState('')
  const [editReason, setEditReason] = useState('')
  const [editDesc, setEditDesc] = useState('')

  // 1. Fetch Classes for dropdown
  const { data: classes = [] } = useQuery({
    queryKey: ['adminClassesForFilter'],
    queryFn: async () => {
      const { data, error } = await supabase.from('classes').select('id, name').order('sort_order', { ascending: true })
      if (error) throw error
      return data
    }
  })

  // 2. Fetch Transactions (all fields, join class & profile)
  const { data: transactions = [], isLoading } = useQuery<TransactionData[]>({
    queryKey: ['adminTransactionsList'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('transactions')
        .select(`
          *,
          class:classes(name),
          creator:profiles!transactions_created_by_fkey(full_name, email),
          cancelled_by_user:profiles!transactions_cancelled_by_fkey(full_name),
          items:transaction_items(item_name, item_type, quantity, unit, unit_price, subtotal)
        `)
        .order('created_at', { ascending: false })
      
      if (error) throw error
      
      return data.map((t: any) => ({
        ...t,
        amount: Number(t.amount),
        balance_before: Number(t.balance_before),
        balance_after: Number(t.balance_after),
        items: t.items || []
      }))
    }
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
      queryClient.invalidateQueries({ queryKey: ['adminTransactionsList'] })
      queryClient.invalidateQueries({ queryKey: ['adminMetrics'] })
      queryClient.invalidateQueries({ queryKey: ['adminClasses'] })
      setCancelOpen(false)
      setSelectedTx(null)
      setCancelReason('')
    },
    onError: (err: any) => {
      toast.error(err.message || 'Gagal membatalkan transaksi')
    }
  })

  // Edit transaction mutation
  const editMutation = useMutation({
    mutationFn: async ({ txId, amount, reason, desc }: { txId: string, amount: number, reason: string, desc: string }) => {
      const { data, error } = await supabase.rpc('edit_lm_transaction', {
        p_transaction_id: txId,
        p_new_amount: amount,
        p_reason: reason,
        p_description: desc
      })
      if (error) throw error
      return data
    },
    onSuccess: () => {
      toast.success('Transaksi berhasil diperbarui!')
      queryClient.invalidateQueries({ queryKey: ['adminTransactionsList'] })
      queryClient.invalidateQueries({ queryKey: ['adminMetrics'] })
      queryClient.invalidateQueries({ queryKey: ['adminClasses'] })
      setEditOpen(false)
      setSelectedTx(null)
      setNewAmount('')
      setEditReason('')
      setEditDesc('')
    },
    onError: (err: any) => {
      toast.error(err.message || 'Gagal mengedit transaksi')
    }
  })

  // Submit Handlers
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

  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedTx || !newAmount || !editReason.trim()) {
      toast.error('Jumlah baru dan alasan koreksi wajib diisi!')
      return
    }
    const val = parseInt(newAmount)
    if (isNaN(val) || val <= 0) {
      toast.error('Nominal harus lebih dari nol!')
      return
    }
    editMutation.mutate({
      txId: selectedTx.id,
      amount: val,
      reason: editReason.trim(),
      desc: editDesc.trim() || selectedTx.description || ''
    })
  }

  // Filter logic
  const filteredTxs = transactions.filter(tx => {
    if (filterClass && tx.class_id !== filterClass) return false
    if (filterType && tx.transaction_type !== filterType) return false
    if (filterStatus && tx.status !== filterStatus) return false
    
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      const matchesNum = tx.transaction_number.toLowerCase().includes(q)
      const matchesDesc = (tx.description || '').toLowerCase().includes(q)
      const matchesClass = tx.class.name.toLowerCase().includes(q)
      return matchesNum || matchesDesc || matchesClass
    }
    
    return true
  })

  const getTxTypeBadge = (type: string) => {
    switch (type) {
      case 'initial_balance': return 'Saldo Awal'
      case 'mission_reward': return 'Reward Misi'
      case 'job_reward': return 'Reward Gaji'
      case 'purchase': return 'Belanja'
      case 'rental': return 'Sewa'
      case 'bonus': return 'Bonus'
      case 'penalty': return 'Denda'
      case 'adjustment_add':
      case 'adjustment_subtract': return 'Penyesuaian'
      case 'refund': return 'Refund'
      default: return 'Transaksi'
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-black text-primary-950">Riwayat Transaksi</h2>
        <p className="text-text-muted text-sm mt-1">Pantau seluruh mutasi keuangan simulasi dan pembatalan transaksi</p>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-surface border border-border p-4 rounded-2xl-card shadow-xs grid grid-cols-1 md:grid-cols-5 gap-3">
        {/* Search */}
        <div className="relative md:col-span-2">
          <input
            type="text"
            placeholder="Cari transaksi (No. Transaksi, Kelas, Keterangan)..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-border focus:outline-none focus:ring-2 focus:ring-primary-700 bg-background text-sm"
          />
          <Search className="h-4.5 w-4.5 absolute left-3.5 top-3.5 text-text-muted" />
        </div>

        {/* Filter Class */}
        <select
          value={filterClass}
          onChange={e => setFilterClass(e.target.value)}
          className="px-3 py-2.5 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary-700"
        >
          <option value="">Semua Kelas</option>
          {classes.map(c => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>

        {/* Filter Type */}
        <select
          value={filterType}
          onChange={e => setFilterType(e.target.value)}
          className="px-3 py-2.5 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary-700"
        >
          <option value="">Semua Tipe</option>
          <option value="initial_balance">Saldo Awal</option>
          <option value="mission_reward">Reward Misi</option>
          <option value="job_reward">Reward Gaji</option>
          <option value="purchase">Belanja</option>
          <option value="rental">Sewa</option>
          <option value="bonus">Bonus</option>
          <option value="penalty">Denda</option>
          <option value="adjustment_add">Koreksi Penambahan</option>
          <option value="adjustment_subtract">Koreksi Pengurangan</option>
          <option value="refund">Refund</option>
        </select>

        {/* Filter Status */}
        <select
          value={filterStatus}
          onChange={e => setFilterStatus(e.target.value)}
          className="px-3 py-2.5 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary-700"
        >
          <option value="">Semua Status</option>
          <option value="completed">Completed</option>
          <option value="cancelled">Cancelled</option>
        </select>
      </div>

      {/* Main Transactions List */}
      {isLoading ? (
        <div className="flex items-center justify-center p-12 bg-surface rounded-2xl-card border border-border">
          <Loader2 className="h-8 w-8 animate-spin text-primary-900" />
        </div>
      ) : (
        <div className="bg-surface rounded-2xl-card border border-border shadow-xs overflow-hidden">
          {/* Desktop Table View */}
          <div className="hidden lg:block overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-primary-50/50 border-b border-border text-primary-950 font-bold text-xs">
                  <th className="p-3 w-32 font-mono">No. Transaksi</th>
                  <th className="p-3">Waktu</th>
                  <th className="p-3">Kelas</th>
                  <th className="p-3">Jenis</th>
                  <th className="p-3 max-w-[200px]">Detail</th>
                  <th className="p-3 text-right">Pemasukan</th>
                  <th className="p-3 text-right">Pengeluaran</th>
                  <th className="p-3 text-right">Saldo Setelah</th>
                  <th className="p-3">Oleh</th>
                  <th className="p-3 text-center">Status</th>
                  <th className="p-3 text-center">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border text-sm">
                {filteredTxs.map((tx) => (
                  <tr key={tx.id} className={`hover:bg-primary-50/10 ${tx.status === 'cancelled' ? 'bg-red-50/10 opacity-70' : ''}`}>
                    <td className="p-3 font-mono font-bold text-primary-950">{tx.transaction_number}</td>
                    <td className="p-3 text-text-muted leading-tight whitespace-nowrap">
                      {new Date(tx.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}<br/>
                      <span className="text-[10px]">{new Date(tx.created_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })} WIB</span>
                    </td>
                    <td className="p-3 font-extrabold text-primary-950">{tx.class.name}</td>
                    <td className="p-3 font-semibold text-primary-800">{getTxTypeBadge(tx.transaction_type)}</td>
                    <td className="p-3 max-w-[200px]">
                      <div className="truncate font-medium text-primary-950" title={tx.description || ''}>
                        {tx.description || '-'}
                      </div>
                      {/* Collapse item snapshot summary */}
                      {tx.items && tx.items.length > 0 && (
                        <div className="text-[10px] text-text-muted font-mono mt-0.5 truncate">
                          {tx.items.map(i => `${i.item_name} (x${i.quantity})`).join(', ')}
                        </div>
                      )}
                    </td>
                    <td className="p-3 text-right font-bold text-income whitespace-nowrap">
                      {tx.direction === 'income' && tx.status !== 'cancelled' ? `+${formatLM(tx.amount)}` : ''}
                    </td>
                    <td className="p-3 text-right font-bold text-expense whitespace-nowrap">
                      {tx.direction === 'expense' && tx.status !== 'cancelled' ? `-${formatLM(tx.amount)}` : ''}
                    </td>
                    <td className="p-3 text-right font-extrabold text-primary-950">{formatLM(tx.balance_after)}</td>
                    <td className="p-3 text-text-muted leading-none">
                      <span className="font-semibold block truncate max-w-[80px]">{tx.creator?.full_name || 'System'}</span>
                    </td>
                    <td className="p-3 text-center">
                      <span className={`text-[10px] font-black px-2 py-0.5 rounded-full uppercase border ${
                        tx.status === 'completed' 
                          ? 'bg-green-50 text-income border-green-200' 
                          : 'bg-red-50 text-red-600 border-red-200'
                      }`}>
                        {tx.status}
                      </span>
                    </td>
                    <td className="p-3 text-center">
                      {tx.status === 'completed' ? (
                        <div className="flex justify-center gap-1.5">
                          <button
                            onClick={() => {
                              setSelectedTx(tx)
                              setNewAmount(tx.amount.toString())
                              setEditDesc(tx.description || '')
                              setEditReason('')
                              setEditOpen(true)
                            }}
                            className="p-1.5 rounded-lg text-primary-950 hover:bg-primary-50 border border-border"
                            title="Koreksi Transaksi"
                          >
                            <Edit className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => {
                              setSelectedTx(tx)
                              setCancelReason('')
                              setCancelOpen(true)
                            }}
                            className="p-1.5 rounded-lg text-red-600 hover:bg-red-50 border border-border"
                            title="Batalkan Transaksi"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      ) : (
                        <span className="text-[10px] font-medium text-text-muted">No Actions</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile Card Layout */}
          <div className="lg:hidden divide-y divide-border">
            {filteredTxs.map((tx) => (
              <div key={tx.id} className={`p-4 space-y-3 ${tx.status === 'cancelled' ? 'bg-red-50/10 opacity-70' : ''}`}>
                <div className="flex justify-between items-start">
                  <div>
                    <span className="text-xs font-mono font-bold text-text-muted leading-none">{tx.transaction_number}</span>
                    <h4 className="text-base font-black text-primary-950 mt-1 leading-tight">{tx.class.name} &bull; {getTxTypeBadge(tx.transaction_type)}</h4>
                    <span className="text-[10px] text-text-muted block mt-0.5">
                      {new Date(tx.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })} &bull; {new Date(tx.created_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
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
                    <span className="text-xs text-text-muted block mt-0.5">Saldo: {formatLM(tx.balance_after)}</span>
                  </div>
                </div>

                <div className="bg-background p-2.5 rounded-xl border border-border text-xs text-text-muted">
                  <div className="font-semibold text-primary-950 truncate">{tx.description || 'Tidak ada keterangan'}</div>
                  {tx.items && tx.items.length > 0 && (
                    <div className="mt-1 font-mono text-[10px]">
                      {tx.items.map(i => `${i.item_name} (x${i.quantity} @${i.unit_price} LM)`).join(', ')}
                    </div>
                  )}
                  {tx.status === 'cancelled' && (
                    <div className="mt-2 text-red-600 font-bold border-t border-red-100 pt-1.5">
                      Dibatalkan oleh {tx.cancelled_by_user?.full_name || 'System'}: "{tx.cancellation_reason}"
                    </div>
                  )}
                  {tx.edited_at && (
                    <div className="mt-2 text-amber-700 font-semibold border-t border-amber-100 pt-1.5">
                      Dikoreksi Admin: "{tx.edit_reason}"
                    </div>
                  )}
                </div>

                <div className="flex justify-between items-center text-xs">
                  <span className="font-medium text-text-muted">Oleh: {tx.creator?.full_name || 'System'}</span>
                  {tx.status === 'completed' ? (
                    <div className="flex gap-2">
                      <button
                        onClick={() => {
                          setSelectedTx(tx)
                          setNewAmount(tx.amount.toString())
                          setEditDesc(tx.description || '')
                          setEditReason('')
                          setEditOpen(true)
                        }}
                        className="px-2.5 py-1.5 rounded-lg border border-border text-primary-950 font-bold text-xs"
                      >
                        Koreksi
                      </button>
                      <button
                        onClick={() => {
                          setSelectedTx(tx)
                          setCancelReason('')
                          setCancelOpen(true)
                        }}
                        className="px-2.5 py-1.5 rounded-lg border border-red-200 text-red-600 font-bold text-xs"
                      >
                        Batal
                      </button>
                    </div>
                  ) : (
                    <span className="text-[10px] font-bold text-red-600 uppercase">Dibatalkan</span>
                  )}
                </div>
              </div>
            ))}
          </div>
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
                  placeholder="Koreksi salah belanja / salah klik / sisa sewa dikembalikan..."
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
                  className="flex-1 py-3 px-4 bg-red-600 text-white font-bold hover:bg-red-700 rounded-xl transition-all shadow-md flex items-center justify-center gap-2"
                  disabled={cancelMutation.isPending}
                >
                  {cancelMutation.isPending ? <Loader2 className="h-5 w-5 animate-spin" /> : 'Ya, Batalkan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit (Koreksi) Transaction Dialog */}
      {editOpen && selectedTx && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="relative w-full max-w-md bg-surface rounded-2xl-card shadow-2xl overflow-hidden border border-border p-6">
            <button 
              onClick={() => { setEditOpen(false); setSelectedTx(null); }}
              className="absolute top-4 right-4 p-2 rounded-xl text-text-muted hover:bg-primary-50 transition-colors"
            >
              <X className="h-6 w-6" />
            </button>

            <h3 className="text-2xl font-black text-primary-950 mb-2">Koreksi Transaksi</h3>
            <p className="text-sm text-text-muted mb-4">
              Ubah jumlah nominal untuk transaksi <strong className="text-primary-950">{selectedTx.transaction_number}</strong> ({selectedTx.class.name}).
            </p>

            <form onSubmit={handleEditSubmit} className="space-y-4">
              <div className="bg-primary-50 p-4 rounded-xl border border-primary-100 text-sm space-y-1 font-semibold text-primary-950">
                <div className="flex justify-between">
                  <span>Nominal Lama:</span>
                  <span>{formatLM(selectedTx.amount)}</span>
                </div>
                {newAmount && !isNaN(parseInt(newAmount)) && (
                  <div className="flex justify-between border-t border-primary-100 pt-1.5 mt-1.5 font-bold">
                    <span>Selisih Koreksi:</span>
                    <span className={parseInt(newAmount) - selectedTx.amount >= 0 ? 'text-income' : 'text-expense'}>
                      {parseInt(newAmount) - selectedTx.amount >= 0 ? '+' : ''}
                      {formatLM(parseInt(newAmount) - selectedTx.amount)}
                    </span>
                  </div>
                )}
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-bold text-primary-950 block">Nominal Baru (LM)</label>
                <input
                  type="number"
                  required
                  min="1"
                  value={newAmount}
                  onChange={e => setNewAmount(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary-700 text-lg font-bold"
                  disabled={editMutation.isPending}
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-bold text-primary-950 block">Perbarui Keterangan (Opsional)</label>
                <input
                  type="text"
                  value={editDesc}
                  onChange={e => setEditDesc(e.target.value)}
                  placeholder="Keterangan transaksi..."
                  className="w-full px-4 py-3 rounded-xl border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary-700 text-sm"
                  disabled={editMutation.isPending}
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-bold text-primary-950 block">Alasan Koreksi (Wajib)</label>
                <textarea
                  required
                  rows={2}
                  value={editReason}
                  onChange={e => setEditReason(e.target.value)}
                  placeholder="Salah ketik / koreksi nominal..."
                  className="w-full px-4 py-3 rounded-xl border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary-700 text-sm"
                  disabled={editMutation.isPending}
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => { setEditOpen(false); setSelectedTx(null); }}
                  className="flex-1 py-3 px-4 bg-background border border-border text-primary-950 font-bold hover:bg-primary-50 rounded-xl transition-colors"
                  disabled={editMutation.isPending}
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="flex-1 py-3 px-4 bg-primary-950 text-white font-bold hover:bg-primary-900 rounded-xl transition-all shadow-md flex items-center justify-center gap-2"
                  disabled={editMutation.isPending}
                >
                  {editMutation.isPending ? <Loader2 className="h-5 w-5 animate-spin" /> : 'Simpan Perubahan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
