import React, { useState, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase/supabaseClient'
import { formatLM } from '../../lib/formatters/formatters'
import { 
  Maximize2, 
  Minimize2, 
  Trophy, 
  School, 
  ArrowUpDown
} from 'lucide-react'

interface ClassScore {
  id: string
  name: string
  color: string | null
  icon: string | null
  current_balance: number
  sort_order: number
}

interface AppSettings {
  app_name: string
  activity_name: string
}

export const ScoreboardPage: React.FC = () => {
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [sortByBalance, setSortByBalance] = useState(true) // true: balance desc, false: alphabetical/sort_order

  // 1. Fetch App settings
  const { data: settings } = useQuery<AppSettings>({
    queryKey: ['scoreboardSettings'],
    queryFn: async () => {
      const { data, error } = await supabase.from('app_settings').select('app_name, activity_name').limit(1).maybeSingle()
      if (error) throw error
      return data || { app_name: 'LM Wallet', activity_name: 'Leadership Training' }
    }
  })

  // 2. Fetch Class Balances
  const { data: classes = [], refetch } = useQuery<ClassScore[]>({
    queryKey: ['scoreboardClasses'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('classes')
        .select('id, name, color, icon, current_balance, sort_order')
        .eq('is_active', true)
      
      if (error) throw error
      return data.map(c => ({
        id: c.id,
        name: c.name,
        color: c.color,
        icon: c.icon,
        current_balance: Number(c.current_balance),
        sort_order: c.sort_order
      }))
    }
  })

  // 3. Bind Realtime Sync
  useEffect(() => {
    const channel = supabase
      .channel('realtime:scoreboard_classes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'classes' },
        () => {
          refetch()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [refetch])

  // 4. Handle Fullscreen state checks
  useEffect(() => {
    const onFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement)
    }

    document.addEventListener('fullscreenchange', onFullscreenChange)
    return () => {
      document.removeEventListener('fullscreenchange', onFullscreenChange)
    }
  }, [])

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch((err) => {
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

  // Assign ranks based on sorted by balance
  const rankedClasses = [...classes].sort((a, b) => b.current_balance - a.current_balance)
  const getRank = (classId: string) => {
    return rankedClasses.findIndex(c => c.id === classId) + 1
  }

  const getRankBadgeColor = (rank: number) => {
    if (rank === 1) return 'bg-amber-500 text-white shadow-amber-500/20' // Gold
    if (rank === 2) return 'bg-slate-350 text-slate-900 shadow-slate-300/20 border border-slate-200' // Silver
    if (rank === 3) return 'bg-amber-700 text-white shadow-amber-700/20' // Bronze
    return 'bg-primary-950/10 text-primary-950/70'
  }

  return (
    <div className={`min-h-screen bg-slate-950 text-white p-6 sm:p-10 flex flex-col justify-between transition-all ${isFullscreen ? 'p-12' : ''}`}>
      
      {/* Top Header Panel */}
      <header className="flex flex-col sm:flex-row justify-between items-center gap-4 border-b border-white/10 pb-6 mb-8">
        <div className="text-center sm:text-left space-y-1">
          <div className="flex items-center justify-center sm:justify-start gap-2">
            <Trophy className="h-7 w-7 text-amber-400 animate-pulse" />
            <span className="text-sm font-black uppercase tracking-widest text-primary-400">
              {settings?.activity_name || 'Leadership Training 2026'}
            </span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-white">
            LIVE SCOREBOARD SALDO KELAS
          </h1>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => setSortByBalance(!sortByBalance)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-900 border border-white/10 text-sm font-bold hover:bg-slate-800 transition-colors"
            title="Ubah Urutan"
          >
            <ArrowUpDown className="h-4 w-4 text-primary-400" />
            {sortByBalance ? 'Urutkan Saldo' : 'Urutkan Abjad'}
          </button>
          
          <button
            onClick={toggleFullscreen}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary-700 text-white text-sm font-bold hover:bg-primary-600 transition-colors shadow-lg"
          >
            {isFullscreen ? (
              <>
                <Minimize2 className="h-4 w-4" /> Keluar Fullscreen
              </>
            ) : (
              <>
                <Maximize2 className="h-4 w-4" /> Tampilkan Fullscreen
              </>
            )}
          </button>
        </div>
      </header>

      {/* Main Scoreboard Grid */}
      <main className="flex-1 flex items-center justify-center">
        {sortedClasses.length === 0 ? (
          <div className="text-center space-y-4 max-w-sm">
            <School className="h-16 w-16 text-slate-700 mx-auto animate-bounce" />
            <p className="text-xl font-bold text-slate-400">Belum Ada Data Kelas</p>
            <p className="text-sm text-slate-500">Silakan tambahkan data kelas baru di dashboard admin.</p>
          </div>
        ) : (
          <div className="w-full grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {sortedClasses.map((cls) => {
              const rank = getRank(cls.id)
              const cardAccent = cls.color || '#34735D'
              
              return (
                <div
                  key={cls.id}
                  className="relative bg-slate-900/90 border border-white/10 rounded-2xl p-6 flex flex-col justify-between overflow-hidden shadow-2xl transition-all hover:scale-102 hover:border-white/20"
                  style={{
                    borderTop: `6px solid ${cardAccent}`
                  }}
                >
                  {/* Decorative background glow for top rank classes */}
                  {rank === 1 && (
                    <div className="absolute -top-10 -right-10 w-24 h-24 bg-amber-500/10 blur-2xl rounded-full" />
                  )}

                  {/* Header Row: Name and Rank */}
                  <div className="flex justify-between items-start">
                    <div className="space-y-1">
                      <span className="text-slate-500 font-bold text-xs block tracking-wider uppercase">Kelas</span>
                      <span className="text-3xl font-black tracking-tight text-white block">
                        {cls.name}
                      </span>
                    </div>

                    {/* Rank Badge */}
                    <div className={`h-8 px-3 rounded-full flex items-center justify-center font-black text-sm gap-1 ${getRankBadgeColor(rank)}`}>
                      {rank <= 3 && <Trophy className="h-3.5 w-3.5" />}
                      #{rank}
                    </div>
                  </div>

                  {/* Balance Display */}
                  <div className="mt-8 pt-4 border-t border-white/5 flex flex-col justify-end">
                    <span className="text-slate-500 font-bold text-xs tracking-wider uppercase block">Total Saldo</span>
                    <span className="text-3xl sm:text-4xl font-black text-emerald-400 mt-1 block font-mono">
                      {formatLM(cls.current_balance)}
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </main>

      {/* Footer Info bar */}
      <footer className="mt-8 border-t border-white/10 pt-4 flex flex-col sm:flex-row justify-between items-center text-xs text-slate-500 gap-2">
        <div className="flex items-center gap-1.5 font-bold uppercase tracking-wider text-slate-400">
          <span className="h-2 w-2 rounded-full bg-emerald-500 animate-ping" />
          Koneksi Sinkronisasi Realtime Aktif
        </div>
        <div className="text-slate-500 font-medium">
          Dibuat dengan &hearts; untuk {settings?.app_name || 'LM Wallet'}
        </div>
      </footer>
    </div>
  )
}
