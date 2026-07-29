import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase/supabaseClient'
import { formatLM } from '../../lib/formatters/formatters'
import { 
  School, 
  Coins, 
  TrendingUp, 
  TrendingDown, 
  FileText, 
  Award, 
  Plus, 
  Minus, 
  Edit, 
  ArrowRight, 
  PlusCircle, 
  ShoppingBag, 
  CreditCard, 
  Users, 
  Loader2,
  X
} from 'lucide-react'
import { toast } from 'sonner'

interface ClassData {
  id: string
  name: string
  code: string
  color: string | null
  icon: string | null
  initial_balance: number
  current_balance: number
  public_token: string
  is_active: boolean
  sort_order: number
}

interface RecentActivity {
  id: string
  transaction_number: string
  direction: 'income' | 'expense'
  transaction_type: string
  amount: number
  description: string | null
  status: string
  created_at: string
  class: { name: string }
  creator: { full_name: string | null; email: string } | null
}

export const AdminDashboard: React.FC = () => {
  const queryClient = useQueryClient()
  const [selectedClass, setSelectedClass] = useState<ClassData | null>(null)
  
  // Dialog states
  const [editBalanceOpen, setEditBalanceOpen] = useState(false)
  const [newBalanceValue, setNewBalanceValue] = useState<string>('')
  const [adjustmentReason, setAdjustmentReason] = useState<string>('')
  
  const [adjustBalanceOpen, setAdjustBalanceOpen] = useState(false)
  const [adjustType, setAdjustType] = useState<'add' | 'subtract'>('add')
  const [adjustAmount, setAdjustAmount] = useState<string>('')
  const [adjustReason, setAdjustReason] = useState<string>('')

  // 1. Fetch Classes
  const { data: classes = [], isLoading: classesLoading } = useQuery<ClassData[]>({
    queryKey: ['adminClasses'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('classes')
        .select('*')
        .order('sort_order', { ascending: true })
      if (error) throw error
      return data.map(c => ({
        ...c,
        initial_balance: Number(c.initial_balance),
        current_balance: Number(c.current_balance)
      }))
    }
  })

  // 2. Fetch Metrics (Total balance, income, expense, active structures)
  const { data: metrics, isLoading: metricsLoading } = useQuery({
    queryKey: ['adminMetrics'],
    queryFn: async () => {
      // Sum balances
      const totalBalance = classes.reduce((sum, c) => sum + (c.is_active ? c.current_balance : 0), 0)

      // Total Income
      const { data: incData, error: incErr } = await supabase
        .from('transactions')
        .select('amount')
        .eq('direction', 'income')
        .eq('status', 'completed')
      if (incErr) throw incErr
      const totalIncome = incData.reduce((sum, t) => sum + Number(t.amount), 0)

      // Total Expense
      const { data: expData, error: expErr } = await supabase
        .from('transactions')
        .select('amount')
        .eq('direction', 'expense')
        .eq('status', 'completed')
      if (expErr) throw expErr
      const totalExpense = expData.reduce((sum, t) => sum + Number(t.amount), 0)

      // Today's count
      const todayStr = new Date().toISOString().split('T')[0]
      const { count: todayCount, error: todayErr } = await supabase
        .from('transactions')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', todayStr)
      if (todayErr) throw todayErr

      // Active counts
      const activeClasses = classes.filter(c => c.is_active).length
      
      const { count: activeMissions, error: misErr } = await supabase
        .from('missions')
        .select('*', { count: 'exact', head: true })
        .eq('is_active', true)
      if (misErr) throw misErr

      return {
        totalBalance,
        totalIncome,
        totalExpense,
        todayCount: todayCount || 0,
        activeClasses,
        activeMissions: activeMissions || 0
      }
    },
    enabled: classes.length > 0
  })

  // 3. Fetch Recent Activities
  const { data: recentActivities = [], isLoading: activitiesLoading } = useQuery<RecentActivity[]>({
    queryKey: ['adminRecentActivities'],
    queryFn: async () => {
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
          class:classes(name),
          creator:profiles!transactions_created_by_fkey(full_name, email)
        `)
        .order('created_at', { ascending: false })
        .limit(6)
      
      if (error) throw error
      
      return data.map((t: any) => ({
        id: t.id,
        transaction_number: t.transaction_number,
        direction: t.direction,
        transaction_type: t.transaction_type,
        amount: Number(t.amount),
        description: t.description,
        status: t.status,
        created_at: t.created_at,
        class: t.class ? { name: t.class.name } : { name: 'Unknown' },
        creator: t.creator ? { full_name: t.creator.full_name, email: t.creator.email } : null
      }))
    }
  })

  // Mutations
  // 1. Edit balance override mutation
  const editBalanceMutation = useMutation({
    mutationFn: async ({ classId, newBalance, reason }: { classId: string, newBalance: number, reason: string }) => {
      const { data, error } = await supabase.rpc('set_class_balance', {
        p_class_id: classId,
        p_new_balance: newBalance,
        p_reason: reason
      })
      if (error) throw error
      return data
    },
    onSuccess: () => {
      toast.success('Saldo kelas berhasil diperbarui!')
      queryClient.invalidateQueries({ queryKey: ['adminClasses'] })
      queryClient.invalidateQueries({ queryKey: ['adminMetrics'] })
      queryClient.invalidateQueries({ queryKey: ['adminRecentActivities'] })
      setEditBalanceOpen(false)
      setSelectedClass(null)
      setNewBalanceValue('')
      setAdjustmentReason('')
    },
    onError: (err: any) => {
      toast.error(err.message || 'Gagal mengubah saldo')
    }
  })

  // 2. Adjust Balance Mutation (using create_lm_transaction RPC)
  const adjustBalanceMutation = useMutation({
    mutationFn: async ({ classId, amount, direction, reason }: { classId: string, amount: number, direction: 'income' | 'expense', reason: string }) => {
      const type = direction === 'income' ? 'adjustment_add' : 'adjustment_subtract'
      const { data, error } = await supabase.rpc('create_lm_transaction', {
        p_class_id: classId,
        p_direction: direction,
        p_transaction_type: type,
        p_amount: amount,
        p_description: reason
      })
      if (error) throw error
      return data
    },
    onSuccess: () => {
      toast.success('Pemberian LM berhasil dilakukan!')
      queryClient.invalidateQueries({ queryKey: ['adminClasses'] })
      queryClient.invalidateQueries({ queryKey: ['adminMetrics'] })
      queryClient.invalidateQueries({ queryKey: ['adminRecentActivities'] })
      setAdjustBalanceOpen(false)
      setSelectedClass(null)
      setAdjustAmount('')
      setAdjustReason('')
    },
    onError: (err: any) => {
      toast.error(err.message || 'Gagal menyesuaikan saldo')
    }
  })

  // Handlers
  const handleEditBalanceSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedClass || !newBalanceValue || !adjustmentReason.trim()) {
      toast.error('Semua kolom harus diisi!')
      return
    }

    const newVal = parseInt(newBalanceValue)
    if (isNaN(newVal) || newVal < 0) {
      toast.error('Saldo baru tidak valid!')
      return
    }

    editBalanceMutation.mutate({
      classId: selectedClass.id,
      newBalance: newVal,
      reason: adjustmentReason.trim()
    })
  }

  const handleAdjustBalanceSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedClass || !adjustAmount || !adjustReason.trim()) {
      toast.error('Semua kolom harus diisi!')
      return
    }

    const val = parseInt(adjustAmount)
    if (isNaN(val) || val <= 0) {
      toast.error('Jumlah LM harus lebih dari 0!')
      return
    }

    adjustBalanceMutation.mutate({
      classId: selectedClass.id,
      amount: val,
      direction: adjustType === 'add' ? 'income' : 'expense',
      reason: adjustReason.trim()
    })
  }

  const formatActivityType = (type: string) => {
    switch (type) {
      case 'initial_balance': return 'Saldo Awal'
      case 'mission_reward': return 'Reward Misi'
      case 'job_reward': return 'Reward Gaji'
      case 'purchase': return 'Belanja'
      case 'rental': return 'Sewa'
      case 'bonus': return 'Bonus'
      case 'penalty': return 'Denda'
      case 'adjustment_add':
      case 'adjustment_subtract': return 'Koreksi Saldo'
      default: return 'Transaksi'
    }
  }

  const globalLoading = classesLoading || activitiesLoading

  return (
    <div className="space-y-8">
      {/* Overview Metrics Cards */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        <div className="bg-surface p-5 rounded-2xl-card border border-border shadow-xs flex items-center gap-4">
          <div className="bg-primary-100 text-primary-950 p-3 rounded-xl shrink-0">
            <Coins className="h-6 w-6" />
          </div>
          <div>
            <span className="text-xs font-bold text-text-muted uppercase tracking-wider block">Total Saldo Kelas</span>
            <span className="text-lg sm:text-2xl font-black text-primary-950 block mt-1">
              {metricsLoading ? '...' : formatLM(metrics?.totalBalance)}
            </span>
          </div>
        </div>

        <div className="bg-surface p-5 rounded-2xl-card border border-border shadow-xs flex items-center gap-4">
          <div className="bg-green-50 text-income p-3 rounded-xl shrink-0">
            <TrendingUp className="h-6 w-6" />
          </div>
          <div>
            <span className="text-xs font-bold text-text-muted uppercase tracking-wider block">Total Pemasukan</span>
            <span className="text-lg sm:text-2xl font-black text-income block mt-1">
              {metricsLoading ? '...' : formatLM(metrics?.totalIncome)}
            </span>
          </div>
        </div>

        <div className="bg-surface p-5 rounded-2xl-card border border-border shadow-xs flex items-center gap-4">
          <div className="bg-red-50 text-expense p-3 rounded-xl shrink-0">
            <TrendingDown className="h-6 w-6" />
          </div>
          <div>
            <span className="text-xs font-bold text-text-muted uppercase tracking-wider block">Total Pengeluaran</span>
            <span className="text-lg sm:text-2xl font-black text-expense block mt-1">
              {metricsLoading ? '...' : formatLM(metrics?.totalExpense)}
            </span>
          </div>
        </div>

        <div className="bg-surface p-5 rounded-2xl-card border border-border shadow-xs flex items-center gap-4">
          <div className="bg-indigo-50 text-indigo-700 p-3 rounded-xl shrink-0">
            <FileText className="h-6 w-6" />
          </div>
          <div>
            <span className="text-xs font-bold text-text-muted uppercase tracking-wider block">Transaksi Hari Ini</span>
            <span className="text-lg sm:text-2xl font-black text-primary-950 block mt-1">
              {metricsLoading ? '...' : metrics?.todayCount}
            </span>
          </div>
        </div>
      </section>

      {/* Quick Action Navigation Grid */}
      <section className="bg-surface p-6 rounded-2xl-card border border-border shadow-xs">
        <h3 className="text-xl font-extrabold text-primary-950 mb-4">Aksi Cepat Admin</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          <Link to="/banker/transaction" className="flex flex-col items-center justify-center p-4 rounded-xl bg-primary-50 text-primary-950 hover:bg-primary-100 transition-colors text-center border border-primary-100">
            <PlusCircle className="h-6 w-6 text-primary-800 mb-2" />
            <span className="text-xs font-bold">Buat Transaksi</span>
          </Link>
          <Link to="/admin/classes" className="flex flex-col items-center justify-center p-4 rounded-xl bg-primary-50 text-primary-950 hover:bg-primary-100 transition-colors text-center border border-primary-100">
            <School className="h-6 w-6 text-primary-800 mb-2" />
            <span className="text-xs font-bold">Kelola Kelas</span>
          </Link>
          <Link to="/admin/missions" className="flex flex-col items-center justify-center p-4 rounded-xl bg-primary-50 text-primary-950 hover:bg-primary-100 transition-colors text-center border border-primary-100">
            <Award className="h-6 w-6 text-primary-800 mb-2" />
            <span className="text-xs font-bold">Kelola Misi</span>
          </Link>
          <Link to="/admin/items" className="flex flex-col items-center justify-center p-4 rounded-xl bg-primary-50 text-primary-950 hover:bg-primary-100 transition-colors text-center border border-primary-100">
            <ShoppingBag className="h-6 w-6 text-primary-800 mb-2" />
            <span className="text-xs font-bold">Kelola Barang</span>
          </Link>
          <Link to="/admin/cards" className="flex flex-col items-center justify-center p-4 rounded-xl bg-primary-50 text-primary-950 hover:bg-primary-100 transition-colors text-center border border-primary-100">
            <CreditCard className="h-6 w-6 text-primary-800 mb-2" />
            <span className="text-xs font-bold">Daftar RFID/QR</span>
          </Link>
          <Link to="/admin/users" className="flex flex-col items-center justify-center p-4 rounded-xl bg-primary-50 text-primary-950 hover:bg-primary-100 transition-colors text-center border border-primary-100">
            <Users className="h-6 w-6 text-primary-800 mb-2" />
            <span className="text-xs font-bold">Kelola Banker</span>
          </Link>
        </div>
      </section>

      {/* Main Grid: Class Balances and Recent Activities */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Class Balance Cards */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-2xl font-extrabold text-primary-950">Daftar Kelas & Saldo</h3>
            <Link to="/admin/classes" className="text-sm font-bold text-primary-700 hover:underline flex items-center gap-1">
              Lihat Detail Kelas <ArrowRight className="h-4 w-4" />
            </Link>
          </div>

          {globalLoading ? (
            <div className="flex items-center justify-center p-12 bg-surface rounded-2xl-card border border-border">
              <Loader2 className="h-8 w-8 animate-spin text-primary-900" />
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {classes.map((cls) => (
                <div 
                  key={cls.id}
                  className={`bg-surface border border-border hover:border-primary-100 rounded-2xl-card p-5 shadow-xs flex flex-col justify-between gap-4 transition-all ${
                    !cls.is_active ? 'opacity-60 bg-gray-50' : ''
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span 
                          className="h-3.5 w-3.5 rounded-full inline-block" 
                          style={{ backgroundColor: cls.color || '#143A30' }}
                        />
                        <span className="text-lg font-extrabold text-primary-950 leading-none">{cls.name}</span>
                      </div>
                      <span className="text-xs text-text-muted font-bold font-mono uppercase mt-1 block">CODE: {cls.code}</span>
                    </div>
                    
                    <div className="text-right">
                      <span className="text-xl font-black text-primary-950 block">{formatLM(cls.current_balance)}</span>
                      {!cls.is_active && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-50 text-red-600 border border-red-200">Nonaktif</span>
                      )}
                    </div>
                  </div>

                  {/* Actions Bar */}
                  {cls.is_active && (
                    <div className="grid grid-cols-3 gap-2 pt-2 border-t border-border/60">
                      <button
                        onClick={() => {
                          setSelectedClass(cls)
                          setAdjustType('add')
                          setAdjustBalanceOpen(true)
                        }}
                        className="flex items-center justify-center gap-1 py-2 px-1 text-xs font-bold bg-primary-50 text-primary-950 rounded-lg hover:bg-primary-100 transition-colors border border-primary-100"
                        title="Tambah Saldo"
                      >
                        <Plus className="h-3.5 w-3.5" /> LM
                      </button>
                      <button
                        onClick={() => {
                          setSelectedClass(cls)
                          setAdjustType('subtract')
                          setAdjustBalanceOpen(true)
                        }}
                        className="flex items-center justify-center gap-1 py-2 px-1 text-xs font-bold bg-primary-50 text-primary-950 rounded-lg hover:bg-primary-100 transition-colors border border-primary-100"
                        title="Kurangi Saldo"
                      >
                        <Minus className="h-3.5 w-3.5" /> LM
                      </button>
                      <button
                        onClick={() => {
                          setSelectedClass(cls)
                          setNewBalanceValue(cls.current_balance.toString())
                          setAdjustmentReason('')
                          setEditBalanceOpen(true)
                        }}
                        className="flex items-center justify-center gap-1 py-2 px-1 text-xs font-bold bg-primary-950 text-white rounded-lg hover:bg-primary-900 transition-colors"
                        title="Edit Saldo Langsung"
                      >
                        <Edit className="h-3.5 w-3.5" /> Edit
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent Activities Timeline */}
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-2xl font-extrabold text-primary-950">Aktivitas Terbaru</h3>
            <Link to="/admin/transactions" className="text-sm font-bold text-primary-700 hover:underline">
              Semua
            </Link>
          </div>

          {globalLoading ? (
            <div className="flex items-center justify-center p-12 bg-surface rounded-2xl-card border border-border">
              <Loader2 className="h-8 w-8 animate-spin text-primary-900" />
            </div>
          ) : (
            <div className="bg-surface rounded-2xl-card border border-border p-4 shadow-xs space-y-4">
              {recentActivities.length === 0 ? (
                <p className="text-sm text-text-muted text-center py-6">Belum ada transaksi</p>
              ) : (
                recentActivities.map((act) => (
                  <div key={act.id} className="flex items-start justify-between gap-3 border-b border-border/40 pb-3 last:border-0 last:pb-0">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-extrabold text-primary-950 truncate block">{act.class.name}</span>
                        <span className={`text-[9px] font-extrabold px-1.5 py-0.5 rounded-full uppercase leading-none ${
                          act.direction === 'income' ? 'bg-green-50 text-income border border-green-200' : 'bg-red-50 text-expense border border-red-200'
                        }`}>
                          {formatActivityType(act.transaction_type)}
                        </span>
                      </div>
                      <p className="text-xs text-text-muted truncate mt-1 leading-tight">{act.description || 'Tidak ada keterangan'}</p>
                      <p className="text-[10px] text-text-muted mt-1 leading-none">
                        Oleh: {act.creator?.full_name || 'System'} &bull; {new Date(act.created_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <span className={`text-base font-black ${act.direction === 'income' ? 'text-income' : 'text-expense'}`}>
                        {act.direction === 'income' ? '+' : '-'}{formatLM(act.amount)}
                      </span>
                      {act.status === 'cancelled' && (
                        <span className="text-[8px] font-bold block text-red-500 uppercase">Batal</span>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>

      {/* Edit Saldo Langsung Dialog (Atomic set_class_balance) */}
      {editBalanceOpen && selectedClass && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="relative w-full max-w-md bg-surface rounded-2xl-card shadow-2xl overflow-hidden border border-border p-6">
            <button 
              onClick={() => { setEditBalanceOpen(false); setSelectedClass(null); }}
              className="absolute top-4 right-4 p-2 rounded-xl text-text-muted hover:bg-primary-50 transition-colors"
            >
              <X className="h-6 w-6" />
            </button>

            <h3 className="text-2xl font-black text-primary-950 mb-2">Edit Saldo Langsung</h3>
            <p className="text-sm text-text-muted mb-4">
              Mengubah saldo secara mutlak untuk kelas <strong className="text-primary-950">{selectedClass.name}</strong>.
            </p>

            <form onSubmit={handleEditBalanceSubmit} className="space-y-4">
              <div className="bg-primary-50 p-4 rounded-xl border border-primary-100 text-sm space-y-1 font-semibold text-primary-950">
                <div className="flex justify-between">
                  <span>Saldo Saat Ini:</span>
                  <span>{formatLM(selectedClass.current_balance)}</span>
                </div>
                {newBalanceValue && !isNaN(parseInt(newBalanceValue)) && (
                  <div className="flex justify-between border-t border-primary-100 pt-1.5 mt-1.5 font-bold">
                    <span>Selisih Penyesuaian:</span>
                    <span className={parseInt(newBalanceValue) - selectedClass.current_balance >= 0 ? 'text-income' : 'text-expense'}>
                      {parseInt(newBalanceValue) - selectedClass.current_balance >= 0 ? '+' : ''}
                      {formatLM(parseInt(newBalanceValue) - selectedClass.current_balance)}
                    </span>
                  </div>
                )}
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-bold text-primary-950 block">Saldo Baru (LM)</label>
                <input
                  type="number"
                  required
                  min="0"
                  value={newBalanceValue}
                  onChange={e => setNewBalanceValue(e.target.value)}
                  placeholder="Contoh: 1500"
                  className="w-full px-4 py-3 rounded-xl border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary-700 text-lg font-bold"
                  disabled={editBalanceMutation.isPending}
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-bold text-primary-950 block">Alasan Penyesuaian</label>
                <textarea
                  required
                  rows={3}
                  value={adjustmentReason}
                  onChange={e => setAdjustmentReason(e.target.value)}
                  placeholder="Koreksi kesalahan hadiah misi / denda / dsb..."
                  className="w-full px-4 py-3 rounded-xl border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary-700 text-base"
                  disabled={editBalanceMutation.isPending}
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => { setEditBalanceOpen(false); setSelectedClass(null); }}
                  className="flex-1 py-3 px-4 bg-background border border-border text-primary-950 font-bold hover:bg-primary-50 rounded-xl transition-colors"
                  disabled={editBalanceMutation.isPending}
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="flex-1 py-3 px-4 bg-primary-950 text-white font-bold hover:bg-primary-900 rounded-xl transition-all shadow-md flex items-center justify-center gap-2"
                  disabled={editBalanceMutation.isPending}
                >
                  {editBalanceMutation.isPending ? (
                    <>
                      <Loader2 className="h-5 w-5 animate-spin" />
                      Memproses...
                    </>
                  ) : (
                    'Simpan Saldo'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Adjust Balance Dialog (Give or Take LM) */}
      {adjustBalanceOpen && selectedClass && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="relative w-full max-w-md bg-surface rounded-2xl-card shadow-2xl overflow-hidden border border-border p-6">
            <button 
              onClick={() => { setAdjustBalanceOpen(false); setSelectedClass(null); }}
              className="absolute top-4 right-4 p-2 rounded-xl text-text-muted hover:bg-primary-50 transition-colors"
            >
              <X className="h-6 w-6" />
            </button>

            <h3 className="text-2xl font-black text-primary-950 mb-2">
              {adjustType === 'add' ? 'Tambah LM' : 'Kurangi LM'}
            </h3>
            <p className="text-sm text-text-muted mb-4">
              Menyesuaikan saldo kelas <strong className="text-primary-950">{selectedClass.name}</strong>.
            </p>

            <form onSubmit={handleAdjustBalanceSubmit} className="space-y-4">
              <div className="bg-primary-50 p-4 rounded-xl border border-primary-100 text-sm space-y-1 font-semibold text-primary-950">
                <div className="flex justify-between">
                  <span>Saldo Saat Ini:</span>
                  <span>{formatLM(selectedClass.current_balance)}</span>
                </div>
                {adjustAmount && !isNaN(parseInt(adjustAmount)) && (
                  <div className="flex justify-between border-t border-primary-100 pt-1.5 mt-1.5 font-bold">
                    <span>Saldo Akhir Estimasi:</span>
                    <span className={adjustType === 'add' ? 'text-income' : 'text-expense'}>
                      {formatLM(selectedClass.current_balance + (adjustType === 'add' ? parseInt(adjustAmount) : -parseInt(adjustAmount)))}
                    </span>
                  </div>
                )}
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-bold text-primary-950 block">Nominal (LM)</label>
                <input
                  type="number"
                  required
                  min="1"
                  value={adjustAmount}
                  onChange={e => setAdjustAmount(e.target.value)}
                  placeholder="Contoh: 100"
                  className="w-full px-4 py-3 rounded-xl border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary-700 text-lg font-bold"
                  disabled={adjustBalanceMutation.isPending}
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-bold text-primary-950 block">Keterangan / Alasan</label>
                <textarea
                  required
                  rows={3}
                  value={adjustReason}
                  onChange={e => setAdjustReason(e.target.value)}
                  placeholder="Alasan penambahan atau pengurangan..."
                  className="w-full px-4 py-3 rounded-xl border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary-700 text-base"
                  disabled={adjustBalanceMutation.isPending}
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => { setAdjustBalanceOpen(false); setSelectedClass(null); }}
                  className="flex-1 py-3 px-4 bg-background border border-border text-primary-950 font-bold hover:bg-primary-50 rounded-xl transition-colors"
                  disabled={adjustBalanceMutation.isPending}
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="flex-1 py-3 px-4 bg-primary-950 text-white font-bold hover:bg-primary-900 rounded-xl transition-all shadow-md flex items-center justify-center gap-2"
                  disabled={adjustBalanceMutation.isPending}
                >
                  {adjustBalanceMutation.isPending ? (
                    <>
                      <Loader2 className="h-5 w-5 animate-spin" />
                      Memproses...
                    </>
                  ) : (
                    'Proses Transaksi'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
