import React, { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase/supabaseClient'
import { formatLM } from '../../lib/formatters/formatters'
import { 
  ArrowLeft, 
  AlertCircle, 
  TrendingUp, 
  TrendingDown, 
  FileText, 
  Award, 
  ShoppingBag, 
  Calendar, 
  Clock, 
  HelpCircle,
  AlertTriangle,
  Sparkles,
  RefreshCw,
  Info
} from 'lucide-react'

// Define interfaces
interface TransactionItem {
  item_name: string
  item_type: string
  quantity: number
  unit: string
  unit_price: number
  subtotal: number
}

interface Transaction {
  id: string
  transaction_number: string
  direction: 'income' | 'expense'
  transaction_type: string
  amount: number
  description: string | null
  created_at: string
  items: TransactionItem[]
}

interface WalletData {
  app_name: string
  activity_name: string
  participant_message: string | null
  class_name: string
  class_code: string
  class_color: string | null
  class_icon: string | null
  current_balance: number
  total_income: number
  total_expense: number
  last_updated: string
  transactions: Transaction[]
}

export const WalletPage: React.FC = () => {
  const { publicToken } = useParams<{ publicToken: string }>()
  const [activeTab, setActiveTab] = useState<'semua' | 'pemasukan' | 'pengeluaran' | 'misi' | 'barang_sewa'>('semua')

  const { data, isLoading, error, refetch } = useQuery<WalletData | null>({
    queryKey: ['publicWallet', publicToken],
    queryFn: async () => {
      if (!publicToken) return null
      
      const { data: rpcData, error: rpcError } = await supabase.rpc('get_public_wallet', {
        p_public_token: publicToken
      })
      
      if (rpcError) throw rpcError
      if (!rpcData || rpcData.length === 0) return null
      
      const row = rpcData[0]
      
      // Parse transaction JSON if it's a string, or use directly if parsed
      let txs: Transaction[] = []
      if (row.transactions) {
        txs = typeof row.transactions === 'string' ? JSON.parse(row.transactions) : row.transactions
      }

      return {
        app_name: row.app_name,
        activity_name: row.activity_name,
        participant_message: row.participant_message,
        class_name: row.class_name,
        class_code: row.class_code,
        class_color: row.class_color,
        class_icon: row.class_icon,
        current_balance: Number(row.current_balance),
        total_income: Number(row.total_income),
        total_expense: Number(row.total_expense),
        last_updated: row.last_updated,
        transactions: txs
      }
    },
    enabled: !!publicToken
  })

  // Realtime subscription setup
  useEffect(() => {
    if (!publicToken) return

    const channel = supabase
      .channel(`public:classes:token:${publicToken}`)
      .on(
        'postgres_changes',
        { 
          event: 'UPDATE', 
          schema: 'public', 
          table: 'classes', 
          filter: `public_token=eq.${publicToken}` 
        },
        () => {
          refetch()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [publicToken, refetch])

  if (isLoading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center py-12">
        <LoaderComponent text="Memuat Wallet..." />
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center py-12 text-center max-w-md mx-auto space-y-4">
        <div className="bg-red-50 text-red-700 p-4 rounded-full">
          <AlertTriangle className="h-12 w-12" />
        </div>
        <h2 className="text-2xl font-extrabold text-primary-950">Wallet Tidak Ditemukan</h2>
        <p className="text-text-muted">
          Token wallet ini tidak valid atau kelas dinonaktifkan. Silakan periksa kembali tautan Anda.
        </p>
        <Link
          to="/"
          className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-primary-950 text-white font-bold hover:bg-primary-900 transition-colors"
        >
          <ArrowLeft className="h-5 w-5" /> Kembali Ke Awal
        </Link>
      </div>
    )
  }

  // Format date helper in Indonesian
  const formatTxDate = (dateStr: string) => {
    const date = new Date(dateStr)
    const now = new Date()
    const yesterday = new Date(now)
    yesterday.setDate(yesterday.getDate() - 1)

    const timeStr = date.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })

    if (date.toDateString() === now.toDateString()) {
      return `Hari ini, ${timeStr}`
    } else if (date.toDateString() === yesterday.toDateString()) {
      return `Kemarin, ${timeStr}`
    } else {
      const datePart = date.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })
      return `${datePart}, ${timeStr}`
    }
  }

  // Filter transactions
  const filteredTransactions = data.transactions.filter(tx => {
    if (activeTab === 'semua') return true
    if (activeTab === 'pemasukan') return tx.direction === 'income'
    if (activeTab === 'pengeluaran') return tx.direction === 'expense'
    if (activeTab === 'misi') return tx.transaction_type === 'mission_reward'
    if (activeTab === 'barang_sewa') return ['purchase', 'rental'].includes(tx.transaction_type)
    return true
  })

  // Get transaction details helpers
  const getTxTypeBadge = (type: string) => {
    switch (type) {
      case 'initial_balance': return { label: 'Saldo Awal', color: 'bg-blue-50 text-blue-800 border-blue-200' }
      case 'mission_reward': return { label: 'Misi', color: 'bg-green-50 text-green-800 border-green-200' }
      case 'job_reward': return { label: 'Gaji Job', color: 'bg-emerald-50 text-emerald-800 border-emerald-200' }
      case 'purchase': return { label: 'Belanja', color: 'bg-amber-50 text-amber-800 border-amber-200' }
      case 'rental': return { label: 'Sewa', color: 'bg-indigo-50 text-indigo-800 border-indigo-200' }
      case 'bonus': return { label: 'Bonus', color: 'bg-purple-50 text-purple-800 border-purple-200' }
      case 'penalty': return { label: 'Denda', color: 'bg-red-50 text-red-800 border-red-200' }
      case 'adjustment_add':
      case 'adjustment_subtract': return { label: 'Penyesuaian', color: 'bg-gray-100 text-gray-800 border-gray-300' }
      case 'refund': return { label: 'Refund', color: 'bg-teal-50 text-teal-800 border-teal-200' }
      default: return { label: 'Transaksi', color: 'bg-gray-50 text-gray-700 border-gray-200' }
    }
  }

  const getTxIcon = (type: string, direction: string) => {
    const classStr = "h-5 w-5"
    if (type === 'mission_reward') return <Award className={`${classStr} text-green-700`} />
    if (type === 'purchase') return <ShoppingBag className={`${classStr} text-amber-700`} />
    if (type === 'rental') return <Clock className={`${classStr} text-indigo-700`} />
    if (type === 'bonus') return <Sparkles className={`${classStr} text-purple-700`} />
    if (type === 'penalty') return <AlertCircle className={`${classStr} text-red-700`} />
    if (type === 'adjustment_add' || type === 'adjustment_subtract') return <RefreshCw className={`${classStr} text-gray-600`} />
    
    if (direction === 'income') return <TrendingUp className={`${classStr} text-green-700`} />
    return <TrendingDown className={`${classStr} text-red-700`} />
  }

  return (
    <div className="space-y-6">
      {/* Back to landing */}
      <div className="flex items-center justify-between">
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-primary-950 font-bold hover:text-primary-800 py-2"
        >
          <ArrowLeft className="h-5 w-5" /> Kembali Ke Awal
        </Link>
        
        {/* Dynamic update indicator */}
        <span className="text-xs text-text-muted font-semibold flex items-center gap-1.5 bg-surface px-3 py-1.5 rounded-full border border-border">
          <span className="h-2 w-2 rounded-full bg-green-500 animate-ping"></span>
          Data Realtime
        </span>
      </div>

      {/* Header Banner */}
      <div className="bg-surface rounded-2xl-card border border-border p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <span className="text-xs font-bold text-primary-700 uppercase tracking-widest block">
            {data.activity_name}
          </span>
          <h2 className="text-3xl font-black text-primary-950 mt-1 flex items-center gap-2">
            Kelas: {data.class_name}
          </h2>
          {data.participant_message && (
            <div className="mt-3 flex items-start gap-2 text-text-muted bg-primary-50/50 p-3 rounded-xl border border-primary-100 text-sm max-w-xl">
              <Info className="h-5 w-5 shrink-0 text-primary-800" />
              <p className="leading-relaxed">{data.participant_message}</p>
            </div>
          )}
        </div>

        {/* Sync Info */}
        <div className="text-left md:text-right shrink-0 border-t md:border-t-0 pt-4 md:pt-0 border-border">
          <p className="text-xs text-text-muted font-medium">Terakhir diperbarui:</p>
          <p className="text-sm font-bold text-primary-950 mt-0.5 flex items-center md:justify-end gap-1.5">
            <Calendar className="h-4 w-4 text-text-muted" />
            {data.last_updated ? new Date(data.last_updated).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : '-'} WIB
          </p>
        </div>
      </div>

      {/* Balance Card and Ringkasan Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Main Balance Card */}
        <div className="md:col-span-1 bg-primary-950 text-white rounded-2xl-card p-6 shadow-md flex flex-col justify-between min-h-[160px] border border-primary-900">
          <div>
            <span className="text-sm text-primary-100/90 font-bold uppercase tracking-wider">Saldo Kelas</span>
            <div className="text-4xl sm:text-5xl font-black tracking-tight mt-2">
              {formatLM(data.current_balance)}
            </div>
          </div>
          <div className="text-xs text-primary-100/80 font-medium mt-4">
            Simulasi Leadership Money
          </div>
        </div>

        {/* Aggregate Ringkasan (Pemasukan, Pengeluaran, Jumlah Transaksi) */}
        <div className="md:col-span-2 grid grid-cols-3 gap-4 bg-surface rounded-2xl-card border border-border p-6 shadow-sm">
          <div className="flex flex-col justify-between">
            <div>
              <span className="text-xs font-bold text-text-muted uppercase tracking-wider block">Pemasukan</span>
              <span className="text-lg sm:text-2xl font-black text-income block mt-1.5">
                {formatLM(data.total_income)}
              </span>
            </div>
            <div className="mt-4 flex items-center gap-1.5 text-xs text-income font-bold">
              <TrendingUp className="h-4 w-4" /> Masuk
            </div>
          </div>

          <div className="flex flex-col justify-between border-l border-border pl-4 sm:pl-6">
            <div>
              <span className="text-xs font-bold text-text-muted uppercase tracking-wider block">Pengeluaran</span>
              <span className="text-lg sm:text-2xl font-black text-expense block mt-1.5">
                {formatLM(data.total_expense)}
              </span>
            </div>
            <div className="mt-4 flex items-center gap-1.5 text-xs text-expense font-bold">
              <TrendingDown className="h-4 w-4" /> Keluar
            </div>
          </div>

          <div className="flex flex-col justify-between border-l border-border pl-4 sm:pl-6">
            <div>
              <span className="text-xs font-bold text-text-muted uppercase tracking-wider block">Aktivitas</span>
              <span className="text-lg sm:text-2xl font-black text-primary-950 block mt-1.5">
                {data.transactions.length}
              </span>
            </div>
            <div className="mt-4 flex items-center gap-1.5 text-xs text-text-muted font-bold">
              <FileText className="h-4 w-4" /> Transaksi
            </div>
          </div>
        </div>
      </div>

      {/* Transaction History Section */}
      <div className="space-y-4">
        <h3 className="text-2xl font-extrabold text-primary-950">Aktivitas Wallet</h3>

        {/* Scrollable Tab Filters */}
        <div className="flex gap-2 overflow-x-auto pb-2 -mx-4 px-4 scrollbar-none">
          {[
            { id: 'semua', label: 'Semua' },
            { id: 'pemasukan', label: 'Pemasukan' },
            { id: 'pengeluaran', label: 'Pengeluaran' },
            { id: 'misi', label: 'Misi' },
            { id: 'barang_sewa', label: 'Barang & Sewa' }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-5 py-2.5 rounded-xl text-sm font-bold shrink-0 transition-colors cursor-pointer ${
                activeTab === tab.id
                  ? 'bg-primary-950 text-white shadow-xs'
                  : 'bg-surface text-text-muted border border-border hover:bg-primary-50'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Transactions List */}
        <div className="space-y-3">
          {filteredTransactions.length === 0 ? (
            <div className="bg-surface rounded-2xl-card border border-border py-12 text-center max-w-sm mx-auto p-6 space-y-3">
              <HelpCircle className="h-10 w-10 text-text-muted mx-auto" />
              <p className="text-lg font-bold text-primary-950">Tidak Ada Transaksi</p>
              <p className="text-sm text-text-muted">
                Belum ada aktivitas transaksi yang sesuai dengan kategori ini.
              </p>
            </div>
          ) : (
            filteredTransactions.map(tx => {
              const badge = getTxTypeBadge(tx.transaction_type)
              return (
                <div
                  key={tx.id}
                  className="bg-surface rounded-2xl-card border border-border p-4 shadow-xs flex items-start gap-4 hover:border-primary-100 transition-colors"
                >
                  {/* Icon wrapper */}
                  <div className="bg-background p-3 rounded-xl shrink-0">
                    {getTxIcon(tx.transaction_type, tx.direction)}
                  </div>

                  {/* Transaction metadata */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-semibold text-text-muted font-mono">{tx.transaction_number}</span>
                      <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full uppercase border ${badge.color}`}>
                        {badge.label}
                      </span>
                    </div>

                    <h4 className="text-lg font-extrabold text-primary-950 mt-1 leading-tight">
                      {tx.description || badge.label}
                    </h4>

                    {/* Snapshot transaction items collapse view */}
                    {tx.items && tx.items.length > 0 && (
                      <div className="mt-2 bg-background p-2.5 rounded-xl border border-border space-y-1 text-sm text-text-muted font-medium">
                        {tx.items.map((item, idx) => (
                          <div key={idx} className="flex justify-between">
                            <span>
                              {item.item_name} <span className="text-xs">({item.quantity} {item.unit} &times; {item.unit_price} LM)</span>
                            </span>
                            <span className="font-bold text-primary-950">{formatLM(item.subtotal)}</span>
                          </div>
                        ))}
                      </div>
                    )}

                    <div className="flex items-center gap-1.5 text-xs text-text-muted mt-2 font-semibold">
                      <Clock className="h-3.5 w-3.5" />
                      {formatTxDate(tx.created_at)}
                    </div>
                  </div>

                  {/* Transaction amount */}
                  <div className="shrink-0 text-right">
                    <span className={`text-lg sm:text-xl font-black ${
                      tx.direction === 'income' ? 'text-income' : 'text-expense'
                    }`}>
                      {tx.direction === 'income' ? '+' : '-'}{formatLM(tx.amount)}
                    </span>
                  </div>
                </div>
              )
            })
          )}
        </div>
      </div>
    </div>
  )
}

// Inline Loader component
const LoaderComponent: React.FC<{ text: string }> = ({ text }) => (
  <div className="text-center p-8 space-y-4">
    <div className="h-12 w-12 animate-spin rounded-full border-4 border-primary-700 border-t-transparent mx-auto"></div>
    <p className="text-lg font-bold text-primary-950">{text}</p>
  </div>
)
