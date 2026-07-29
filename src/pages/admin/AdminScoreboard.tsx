import React, { useState, useEffect, useRef } from 'react'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase/supabaseClient'
import { formatLM } from '../../lib/formatters/formatters'
import { 
  Maximize2, 
  Minimize2, 
  School, 
  ArrowUpDown,
  TrendingUp,
  TrendingDown
} from 'lucide-react'

interface LatestTx {
  direction: 'income' | 'expense'
  transaction_type: string
  amount: number
  description: string | null
  created_at: string
}

interface ClassScore {
  id: string
  name: string
  color: string | null
  icon: string | null
  current_balance: number
  sort_order: number
  transactions: LatestTx[]
}

export const AdminScoreboard: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [sortByBalance, setSortByBalance] = useState(true) // true: balance desc, false: alphabetical

  // 1. Fetch Class Balances & Latest Transaction for each
  const { data: classes = [], refetch } = useQuery<ClassScore[]>({
    queryKey: ['scoreboardClasses'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('classes')
        .select(`
          id, name, color, icon, current_balance, sort_order,
          transactions(
            direction, transaction_type, amount, description, status, created_at
          )
        `)
        .eq('is_active', true)
        .eq('transactions.status', 'completed')
        .order('created_at', { referencedTable: 'transactions', ascending: false })
        .limit(2, { referencedTable: 'transactions' })
      
      if (error) throw error

      return (data as any[]).map(c => ({
        id: c.id,
        name: c.name,
        color: c.color,
        icon: c.icon,
        current_balance: Number(c.current_balance),
        sort_order: c.sort_order,
        transactions: (c.transactions || []).map((t: any) => ({
          direction: t.direction,
          transaction_type: t.transaction_type,
          amount: Number(t.amount),
          description: t.description,
          created_at: t.created_at
        }))
      }))
    }
  })

  // 2. Bind Realtime Sync
  useEffect(() => {
    // Listen to updates on both classes and transactions to update scoreboard live
    const classesChannel = supabase
      .channel('realtime:admin_scoreboard_data')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'classes' },
        () => { refetch() }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'transactions' },
        () => { refetch() }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(classesChannel)
    }
  }, [refetch])

  // 3. Fullscreen change listener on container
  useEffect(() => {
    const onFullscreenChange = () => {
      setIsFullscreen(document.fullscreenElement === containerRef.current)
    }

    document.addEventListener('fullscreenchange', onFullscreenChange)
    return () => {
      document.removeEventListener('fullscreenchange', onFullscreenChange)
    }
  }, [])

  const toggleFullscreen = () => {
    if (!containerRef.current) return

    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().catch((err) => {
        console.error(`Error attempting to enable fullscreen: ${err.message}`)
      })
    } else {
      document.exitFullscreen()
    }
  }

  // Sort classes
  const sortedClasses = [...classes].sort((a, b) => {
    if (sortByBalance) {
      if (b.current_balance !== a.current_balance) {
        return b.current_balance - a.current_balance
      }
      return a.sort_order - b.sort_order
    } else {
      return a.sort_order - b.sort_order
    }
  })

  const getTxTypeLabel = (type: string) => {
    switch (type) {
      case 'initial_balance': return 'Saldo Awal'
      case 'mission_reward': return 'Misi'
      case 'job_reward': return 'Gaji Job'
      case 'purchase': return 'Belanja'
      case 'rental': return 'Sewa'
      case 'bonus': return 'Bonus'
      case 'penalty': return 'Denda'
      case 'refund': return 'Refund'
      default: return 'Aktivitas'
    }
  }

  return (
    <div className="space-y-6">
      {/* Top Controls (Only visible when not fullscreen) */}
      {!isFullscreen && (
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-surface p-4 border border-border rounded-2xl-card shadow-xs">
          <div>
            <h2 className="text-2xl font-black text-primary-950">Live Scoreboard</h2>
            <p className="text-text-muted text-sm mt-0.5">Tampilkan peringkat saldo kelas secara realtime di proyektor</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setSortByBalance(!sortByBalance)}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-background border border-border text-sm font-bold text-primary-950 hover:bg-primary-50 transition-colors"
            >
              <ArrowUpDown className="h-4 w-4" />
              {sortByBalance ? 'Urutkan Saldo' : 'Urutkan Abjad'}
            </button>
            
            <button
              onClick={toggleFullscreen}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary-950 text-white text-sm font-bold hover:bg-primary-900 transition-colors shadow-sm"
            >
              <Maximize2 className="h-4 w-4" /> Tampilkan Fullscreen
            </button>
          </div>
        </div>
      )}

      {/* Fullscreenable Container: White background, 3 Columns grid, fixed height */}
      <div 
        ref={containerRef}
        className={`bg-white border border-border p-6 sm:p-10 rounded-2xl-card shadow-xs flex flex-col justify-between transition-all overflow-hidden ${
          isFullscreen 
            ? 'fixed inset-0 z-50 p-12 bg-white flex flex-col justify-between h-screen w-screen overflow-hidden' 
            : 'h-[calc(100vh-170px)]'
        }`}
      >
        {/* Fullscreen mode Header */}
        {isFullscreen && (
          <div className="flex justify-between items-center border-b border-slate-100 pb-4 mb-4 shrink-0">
            <div>
              <span className="text-xs font-black uppercase tracking-widest text-slate-400 block">
                PAPAN SKOR SALDO KELAS
              </span>
              <h1 className="text-3xl font-black text-slate-900 mt-1">
                LIVE SCOREBOARD
              </h1>
            </div>
            
            <button
              onClick={toggleFullscreen}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-900 text-white text-sm font-bold hover:bg-slate-800 transition-colors shadow-md"
            >
              <Minimize2 className="h-4 w-4" /> Keluar Fullscreen
            </button>
          </div>
        )}

        {/* 3 Columns Grid of Cards (stretched to fill 100% of container height) */}
        <div className="flex-1 w-full h-full min-h-0 py-2 flex items-stretch">
          {sortedClasses.length === 0 ? (
            <div className="text-center space-y-3 m-auto">
              <School className="h-12 w-16 text-slate-300 mx-auto" />
              <p className="text-lg font-bold text-slate-950">Belum Ada Data Kelas</p>
            </div>
          ) : (
            <div className="w-full h-full grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {sortedClasses.map((cls) => {
                const cardAccent = cls.color || '#143A30'
                
                return (
                  <div
                    key={cls.id}
                    className="relative bg-slate-50 rounded-2xl flex flex-col justify-between transition-all shadow-xs h-full overflow-hidden border border-slate-100"
                  >
                    {/* Top Header Section: Solid class accent color background */}
                    <div 
                      className="py-4 px-5 flex justify-between items-center text-white shrink-0"
                      style={{ backgroundColor: cardAccent }}
                    >
                      {/* Pojok Kiri: Nama Kelas */}
                      <span className="text-2xl sm:text-3xl font-black tracking-tight">
                        {cls.name}
                      </span>

                      {/* Pojok Kanan: Jumlah Saldo LM */}
                      <span className="text-2xl sm:text-3xl font-black font-mono">
                        {formatLM(cls.current_balance)}
                      </span>
                    </div>

                    {/* Bottom Section: Light activity list of 2 items */}
                    <div className="flex-1 p-4 flex flex-col justify-center bg-slate-100/50">
                      {!cls.transactions || cls.transactions.length === 0 ? (
                        <div className="text-center text-[11px] text-slate-400 font-semibold italic">
                          Belum ada aktivitas terbaru
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {cls.transactions.slice(0, 2).map((tx, idx) => (
                            <div 
                              key={idx} 
                              className={`flex items-center justify-between text-xs pt-1.5 first:pt-0 border-t border-slate-200/50 first:border-0`}
                            >
                              {/* Left side: Mutation amount & type */}
                              <div className="flex items-center gap-1 shrink-0">
                                {tx.direction === 'income' ? (
                                  <TrendingUp className="h-3 w-3 text-income" />
                                ) : (
                                  <TrendingDown className="h-3 w-3 text-expense" />
                                )}
                                <span className={`font-black ${tx.direction === 'income' ? 'text-income' : 'text-expense'}`}>
                                  {tx.direction === 'income' ? '+' : '-'}{tx.amount}
                                </span>
                                <span className="text-[8px] font-extrabold px-1 py-0.5 rounded bg-slate-200 text-slate-700 uppercase leading-none">
                                  {getTxTypeLabel(tx.transaction_type)}
                                </span>
                              </div>

                              {/* Right side: Description & Time */}
                              <div className="flex items-center gap-1.5 max-w-[130px] justify-end flex-1 min-w-0">
                                <span className="text-[10px] text-slate-600 font-bold truncate" title={tx.description || ''}>
                                  {tx.description || '-'}
                                </span>
                                <span className="text-[8px] text-slate-400 font-bold shrink-0">
                                  {new Date(tx.created_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
