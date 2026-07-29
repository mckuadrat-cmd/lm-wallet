import React from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase/supabaseClient'
import { useAuth } from '../../app/providers/AuthProvider'
import { formatLM } from '../../lib/formatters/formatters'
import { 
  Coins, 
  TrendingUp, 
  TrendingDown, 
  History, 
  ShoppingBag, 
  Clock, 
  Award, 
  Sparkles, 
  AlertTriangle, 
  Loader2,
  School
} from 'lucide-react'

interface ClassBalance {
  id: string
  name: string
  current_balance: number
}

interface BankerTx {
  id: string
  transaction_number: string
  direction: 'income' | 'expense'
  transaction_type: string
  amount: number
  description: string | null
  status: string
  created_at: string
  class: { name: string }
}

export const BankerDashboard: React.FC = () => {
  const { user } = useAuth()

  // 1. Fetch Today's Stats for this Banker
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['bankerTodayStats', user?.id],
    queryFn: async () => {
      if (!user) return null
      
      const todayStr = new Date().toISOString().split('T')[0]
      const { data, error } = await supabase
        .from('transactions')
        .select('amount, direction, status')
        .eq('created_by', user.id)
        .gte('created_at', todayStr)
      
      if (error) throw error

      const completed = data.filter(t => t.status === 'completed')
      const totalTx = data.length
      
      const totalInc = completed
        .filter(t => t.direction === 'income')
        .reduce((sum, t) => sum + Number(t.amount), 0)

      const totalExp = completed
        .filter(t => t.direction === 'expense')
        .reduce((sum, t) => sum + Number(t.amount), 0)

      return {
        totalTx,
        totalInc,
        totalExp
      }
    },
    enabled: !!user
  })

  // 2. Fetch Class Balances Summary
  const { data: classes = [], isLoading: classesLoading } = useQuery<ClassBalance[]>({
    queryKey: ['bankerClassesSummary'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('classes')
        .select('id, name, current_balance')
        .eq('is_active', true)
        .order('sort_order', { ascending: true })
      
      if (error) throw error
      return data.map(c => ({
        id: c.id,
        name: c.name,
        current_balance: Number(c.current_balance)
      }))
    }
  })

  // 3. Fetch Banker's Recent Transactions
  const { data: recentTxs = [], isLoading: txsLoading } = useQuery<BankerTx[]>({
    queryKey: ['bankerRecentTxs', user?.id],
    queryFn: async () => {
      if (!user) return []
      
      const { data, error } = await supabase
        .from('transactions')
        .select(`
          id,
          transaction_number,
          direction,
          transaction_type,
          amount,
          description,
          status,
          created_at,
          class:classes(name)
        `)
        .eq('created_by', user.id)
        .order('created_at', { ascending: false })
        .limit(5)
      
      if (error) throw error
      return data.map((t: any) => ({
        ...t,
        amount: Number(t.amount),
        class: t.class ? { name: t.class.name } : { name: 'Unknown' }
      }))
    },
    enabled: !!user
  })

  const getTxIcon = (type: string, direction: string) => {
    const cls = "h-5 w-5"
    if (type === 'mission_reward') return <Award className={`${cls} text-green-700`} />
    if (type === 'purchase') return <ShoppingBag className={`${cls} text-amber-700`} />
    if (type === 'rental') return <Clock className={`${cls} text-indigo-700`} />
    if (type === 'bonus') return <Sparkles className={`${cls} text-purple-700`} />
    if (type === 'penalty') return <AlertTriangle className={`${cls} text-red-700`} />
    
    if (direction === 'income') return <TrendingUp className={`${cls} text-green-700`} />
    return <TrendingDown className={`${cls} text-red-700`} />
  }

  const globalLoading = statsLoading || classesLoading || txsLoading

  return (
    <div className="space-y-8">
      {/* Welcome Banner */}
      <div>
        <h2 className="text-3xl font-black text-primary-950">Portal Banker</h2>
        <p className="text-text-muted text-sm mt-1">Gunakan panel ini untuk memproses pembayaran, sewa, denda, dan pencatatan LM kegiatan</p>
      </div>

      {/* Transaction Aggregate Summary */}
      <section className="grid grid-cols-3 gap-4 bg-surface border border-border p-5 rounded-2xl-card shadow-xs">
        <div className="flex flex-col justify-between">
          <div>
            <span className="text-[10px] sm:text-xs font-bold text-text-muted uppercase tracking-wider block">Transaksi Hari Ini</span>
            <span className="text-lg sm:text-2xl font-black text-primary-950 block mt-1">
              {stats?.totalTx ?? 0}
            </span>
          </div>
          <div className="text-[10px] text-text-muted mt-3 font-semibold flex items-center gap-1">
            <Coins className="h-3.5 w-3.5" /> Total Catat
          </div>
        </div>

        <div className="flex flex-col justify-between border-l border-border pl-4 sm:pl-6">
          <div>
            <span className="text-[10px] sm:text-xs font-bold text-text-muted uppercase tracking-wider block">LM Masuk</span>
            <span className="text-lg sm:text-2xl font-black text-income block mt-1">
              {formatLM(stats?.totalInc ?? 0)}
            </span>
          </div>
          <div className="text-[10px] text-income mt-3 font-bold flex items-center gap-1">
            <TrendingUp className="h-3.5 w-3.5" /> Total Hadiah
          </div>
        </div>

        <div className="flex flex-col justify-between border-l border-border pl-4 sm:pl-6">
          <div>
            <span className="text-[10px] sm:text-xs font-bold text-text-muted uppercase tracking-wider block">LM Keluar</span>
            <span className="text-lg sm:text-2xl font-black text-expense block mt-1">
              {formatLM(stats?.totalExp ?? 0)}
            </span>
          </div>
          <div className="text-[10px] text-expense mt-3 font-bold flex items-center gap-1">
            <TrendingDown className="h-3.5 w-3.5" /> Total Belanja
          </div>
        </div>
      </section>

      {/* Quick Action Large Buttons */}
      <section className="space-y-4">
        <h3 className="text-xl font-bold text-primary-950">Mulai Transaksi Baru</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          <Link
            to="/banker/transaction?type=purchase"
            className="flex flex-col items-center justify-center p-5 rounded-2xl bg-surface border border-border hover:border-primary-700 text-center transition-all group hover:shadow-sm"
          >
            <ShoppingBag className="h-8 w-8 text-primary-900 mb-2 group-hover:scale-105 transition-transform" />
            <span className="text-sm font-bold text-primary-950">Belanja Barang</span>
          </Link>

          <Link
            to="/banker/transaction?type=rental"
            className="flex flex-col items-center justify-center p-5 rounded-2xl bg-surface border border-border hover:border-primary-700 text-center transition-all group hover:shadow-sm"
          >
            <Clock className="h-8 w-8 text-primary-900 mb-2 group-hover:scale-105 transition-transform" />
            <span className="text-sm font-bold text-primary-950">Sewa Alat</span>
          </Link>

          <Link
            to="/banker/transaction?type=mission"
            className="flex flex-col items-center justify-center p-5 rounded-2xl bg-surface border border-border hover:border-primary-700 text-center transition-all group hover:shadow-sm"
          >
            <Award className="h-8 w-8 text-primary-900 mb-2 group-hover:scale-105 transition-transform" />
            <span className="text-sm font-bold text-primary-950">Hadiah Misi</span>
          </Link>

          <Link
            to="/banker/transaction?type=bonus"
            className="flex flex-col items-center justify-center p-5 rounded-2xl bg-surface border border-border hover:border-primary-700 text-center transition-all group hover:shadow-sm"
          >
            <Sparkles className="h-8 w-8 text-primary-900 mb-2 group-hover:scale-105 transition-transform" />
            <span className="text-sm font-bold text-primary-950">Bonus Kelas</span>
          </Link>

          <Link
            to="/banker/transaction?type=penalty"
            className="flex flex-col items-center justify-center p-5 rounded-2xl bg-surface border border-border hover:border-primary-700 text-center transition-all group hover:shadow-sm"
          >
            <AlertTriangle className="h-8 w-8 text-primary-900 mb-2 group-hover:scale-105 transition-transform" />
            <span className="text-sm font-bold text-primary-950">Denda / Penalty</span>
          </Link>

          <Link
            to="/banker/transaction?type=other_income"
            className="flex flex-col items-center justify-center p-5 rounded-2xl bg-surface border border-border hover:border-primary-700 text-center transition-all group hover:shadow-sm"
          >
            <Coins className="h-8 w-8 text-primary-900 mb-2 group-hover:scale-105 transition-transform" />
            <span className="text-sm font-bold text-primary-950">Lain-Lain (In/Out)</span>
          </Link>
        </div>
      </section>

      {/* Main grids */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Class Balances Quick Look */}
        <div className="lg:col-span-1 space-y-4">
          <h3 className="text-xl font-bold text-primary-950">Ringkasan Saldo Kelas</h3>
          
          {globalLoading ? (
            <div className="flex items-center justify-center p-8 bg-surface rounded-2xl-card border border-border">
              <Loader2 className="h-6 w-6 animate-spin text-primary-900" />
            </div>
          ) : (
            <div className="bg-surface rounded-2xl-card border border-border p-4 shadow-xs divide-y divide-border/60">
              {classes.map(c => (
                <div key={c.id} className="flex justify-between items-center py-2.5 first:pt-0 last:pb-0">
                  <div className="flex items-center gap-2">
                    <School className="h-4 w-4 text-text-muted" />
                    <span className="font-extrabold text-primary-950">{c.name}</span>
                  </div>
                  <span className="font-black text-primary-950">{formatLM(c.current_balance)}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Banker Recent Activities */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-xl font-bold text-primary-950">Catatan Transaksi Anda</h3>
            <Link to="/banker/history" className="text-sm font-bold text-primary-700 hover:underline flex items-center gap-1">
              Selengkapnya <History className="h-4 w-4" />
            </Link>
          </div>

          {globalLoading ? (
            <div className="flex items-center justify-center p-8 bg-surface rounded-2xl-card border border-border">
              <Loader2 className="h-6 w-6 animate-spin text-primary-900" />
            </div>
          ) : (
            <div className="bg-surface rounded-2xl-card border border-border p-4 shadow-xs space-y-3">
              {recentTxs.length === 0 ? (
                <p className="text-sm text-text-muted text-center py-8">Anda belum memproses transaksi hari ini.</p>
              ) : (
                recentTxs.map(tx => (
                  <div key={tx.id} className="flex items-center gap-4 bg-background p-3 rounded-xl border border-border/40">
                    <div className="bg-surface p-2 rounded-lg shrink-0">
                      {getTxIcon(tx.transaction_type, tx.direction)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-center">
                        <span className="text-[10px] font-mono text-text-muted">{tx.transaction_number}</span>
                        <span className="text-[10px] text-text-muted font-medium">
                          {new Date(tx.created_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <h4 className="text-sm font-bold text-primary-950 truncate mt-0.5">
                        {tx.class.name} &bull; {tx.description || 'Transaksi'}
                      </h4>
                    </div>
                    <div className="shrink-0 text-right">
                      <span className={`text-sm font-black ${
                        tx.status === 'cancelled'
                          ? 'text-text-muted line-through'
                          : (tx.direction === 'income' ? 'text-income' : 'text-expense')
                      }`}>
                        {tx.status === 'cancelled' ? '' : (tx.direction === 'income' ? '+' : '-')}{formatLM(tx.amount)}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
