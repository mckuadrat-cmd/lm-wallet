import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase/supabaseClient'
import { formatLM } from '../../lib/formatters/formatters'
import { 
  Edit, 
  Loader2, 
  PlusCircle, 
  RefreshCw,
  ToggleLeft,
  ToggleRight,
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

export const ManageClasses: React.FC = () => {
  const queryClient = useQueryClient()
  const [isOpen, setIsOpen] = useState(false)
  const [editingClass, setEditingClass] = useState<ClassData | null>(null)
  
  // Form fields
  const [name, setName] = useState('')
  const [code, setCode] = useState('')
  const [color, setColor] = useState('#143A30')
  const [icon, setIcon] = useState('Compass')
  const [initialBalance, setInitialBalance] = useState('1500')
  const [isActiveStatus, setIsActiveStatus] = useState(true)
  const [sortOrder, setSortOrder] = useState('1')

  const { data: classes = [], isLoading } = useQuery<ClassData[]>({
    queryKey: ['adminClassesList'],
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

  // Open Add Dialog
  const openAdd = () => {
    setEditingClass(null)
    setName('')
    setCode('')
    setColor('#143A30')
    setIcon('Compass')
    setInitialBalance('1500')
    setIsActiveStatus(true)
    setSortOrder((classes.length + 1).toString())
    setIsOpen(true)
  }

  // Open Edit Dialog
  const openEdit = (cls: ClassData) => {
    setEditingClass(cls)
    setName(cls.name)
    setCode(cls.code)
    setColor(cls.color || '#143A30')
    setIcon(cls.icon || 'Compass')
    setInitialBalance(cls.initial_balance.toString())
    setIsActiveStatus(cls.is_active)
    setSortOrder(cls.sort_order.toString())
    setIsOpen(true)
  }

  // Generate unique public token helper
  const generateToken = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
    let token = ''
    for (let i = 0; i < 8; i++) {
      token += chars.charAt(Math.floor(Math.random() * chars.length))
    }
    return token
  }

  // Create or Update mutation
  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        name,
        code: code.trim().toLowerCase(),
        color,
        icon,
        initial_balance: parseInt(initialBalance) || 0,
        sort_order: parseInt(sortOrder) || 0,
        is_active: isActiveStatus,
      }

      if (editingClass) {
        const { error } = await supabase
          .from('classes')
          .update(payload)
          .eq('id', editingClass.id)
        if (error) throw error
      } else {
        // Create new
        const token = generateToken()
        const newClassId = crypto.randomUUID()
        
        // 1. Create class
        const { error: clsError } = await supabase
          .from('classes')
          .insert({
            id: newClassId,
            ...payload,
            current_balance: payload.initial_balance, // initial match
            public_token: token
          })
        if (clsError) throw clsError

        // 2. Automatically create cards entry
        const { error: cardError } = await supabase
          .from('class_cards')
          .insert({
            class_id: newClassId,
            qr_token: `QR-${token}`,
            status: 'active'
          })
        if (cardError) throw cardError

        // 3. Create initial balance transaction history entry
        const txNumber = 'TX-INIT-' + token
        const { error: txError } = await supabase
          .from('transactions')
          .insert({
            transaction_number: txNumber,
            class_id: newClassId,
            direction: 'income',
            transaction_type: 'initial_balance',
            amount: payload.initial_balance,
            description: 'Saldo Awal Kegiatan (Pendaftaran Kelas)',
            status: 'completed',
            balance_before: 0,
            balance_after: payload.initial_balance
          })
        if (txError) throw txError
      }
    },
    onSuccess: () => {
      toast.success(editingClass ? 'Kelas diperbarui!' : 'Kelas ditambahkan!')
      queryClient.invalidateQueries({ queryKey: ['adminClassesList'] })
      queryClient.invalidateQueries({ queryKey: ['adminClasses'] })
      setIsOpen(false)
    },
    onError: (err: any) => {
      toast.error(err.message || 'Gagal menyimpan data')
    }
  })

  // Toggle status mutation
  const toggleStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string, status: boolean }) => {
      const { error } = await supabase
        .from('classes')
        .update({ is_active: status })
        .eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      toast.success('Status kelas berhasil diubah!')
      queryClient.invalidateQueries({ queryKey: ['adminClassesList'] })
      queryClient.invalidateQueries({ queryKey: ['adminClasses'] })
    },
    onError: (err: any) => {
      toast.error(err.message || 'Gagal mengubah status')
    }
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim() || !code.trim()) {
      toast.error('Nama dan Kode kelas wajib diisi!')
      return
    }
    saveMutation.mutate()
  }

  // Regenerate public token
  const handleRegenerateToken = async (cls: ClassData) => {
    const newToken = generateToken()
    try {
      const { error } = await supabase
        .from('classes')
        .update({ public_token: newToken })
        .eq('id', cls.id)
      if (error) throw error
      
      // Update associated class card QR token
      await supabase
        .from('class_cards')
        .update({ qr_token: `QR-${newToken}` })
        .eq('class_id', cls.id)

      toast.success('Public Token & QR berhasil diperbarui!')
      queryClient.invalidateQueries({ queryKey: ['adminClassesList'] })
    } catch (err: any) {
      toast.error(err.message || 'Gagal memperbarui token')
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-black text-primary-950">Manajemen Kelas</h2>
          <p className="text-text-muted text-sm mt-1">Kelola kelas peserta kegiatan dan token akses mereka</p>
        </div>
        <button
          onClick={openAdd}
          className="inline-flex items-center gap-2 px-5 py-3 bg-primary-950 text-white font-bold hover:bg-primary-900 rounded-xl transition-colors cursor-pointer text-base shadow-sm"
        >
          <PlusCircle className="h-5 w-5" /> Tambah Kelas
        </button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center p-12 bg-surface rounded-2xl-card border border-border">
          <Loader2 className="h-8 w-8 animate-spin text-primary-900" />
        </div>
      ) : (
        <div className="bg-surface rounded-2xl-card border border-border shadow-xs overflow-hidden">
          {/* Desktop Table View */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-primary-50/50 border-b border-border text-primary-950 font-bold text-sm">
                  <th className="p-4 w-12 text-center">No</th>
                  <th className="p-4">Nama Kelas</th>
                  <th className="p-4">Kode</th>
                  <th className="p-4">Saldo Awal</th>
                  <th className="p-4">Saldo Saat Ini</th>
                  <th className="p-4">Public Token (Akses Wallet)</th>
                  <th className="p-4 text-center">Status</th>
                  <th className="p-4 text-center">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border text-base">
                {classes.map((cls) => (
                  <tr key={cls.id} className={`hover:bg-primary-50/20 ${!cls.is_active ? 'opacity-65 bg-gray-50/50' : ''}`}>
                    <td className="p-4 text-center font-bold text-text-muted">{cls.sort_order}</td>
                    <td className="p-4">
                      <div className="flex items-center gap-2">
                        <span 
                          className="h-3 w-3 rounded-full shrink-0" 
                          style={{ backgroundColor: cls.color || '#143A30' }}
                        />
                        <span className="font-extrabold text-primary-950">{cls.name}</span>
                      </div>
                    </td>
                    <td className="p-4 font-mono font-bold text-primary-900 uppercase">{cls.code}</td>
                    <td className="p-4 font-semibold text-text-muted">{formatLM(cls.initial_balance)}</td>
                    <td className="p-4 font-black text-primary-950">{formatLM(cls.current_balance)}</td>
                    <td className="p-4">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold bg-primary-50 px-2.5 py-1 rounded-lg text-primary-950 text-sm border border-primary-100">
                          {cls.public_token}
                        </span>
                        <button
                          onClick={() => handleRegenerateToken(cls)}
                          className="p-1 rounded-md text-text-muted hover:text-primary-950 hover:bg-primary-100 transition-colors"
                          title="Buat Ulang Token & QR"
                        >
                          <RefreshCw className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                    <td className="p-4 text-center">
                      <button
                        onClick={() => toggleStatusMutation.mutate({ id: cls.id, status: !cls.is_active })}
                        className="mx-auto block text-text-muted hover:text-primary-950"
                      >
                        {cls.is_active ? (
                          <ToggleRight className="h-8 w-8 text-primary-800" />
                        ) : (
                          <ToggleLeft className="h-8 w-8 text-gray-400" />
                        )}
                      </button>
                    </td>
                    <td className="p-4 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => openEdit(cls)}
                          className="p-2 rounded-xl text-primary-950 hover:bg-primary-100 transition-colors border border-border"
                          title="Edit Kelas"
                        >
                          <Edit className="h-4.5 w-4.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile Card Layout */}
          <div className="md:hidden divide-y divide-border">
            {classes.map((cls) => (
              <div key={cls.id} className={`p-4 space-y-3 ${!cls.is_active ? 'opacity-65 bg-gray-50/50' : ''}`}>
                <div className="flex justify-between items-start">
                  <div>
                    <div className="flex items-center gap-2">
                      <span 
                        className="h-3 w-3 rounded-full shrink-0" 
                        style={{ backgroundColor: cls.color || '#143A30' }}
                      />
                      <span className="text-lg font-black text-primary-950">{cls.name}</span>
                    </div>
                    <span className="text-xs font-mono font-bold text-text-muted uppercase mt-0.5 block">CODE: {cls.code}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-lg font-black text-primary-950 block">{formatLM(cls.current_balance)}</span>
                    <span className="text-xs text-text-muted font-semibold block mt-0.5">Awal: {formatLM(cls.initial_balance)}</span>
                  </div>
                </div>

                <div className="flex items-center justify-between text-sm pt-2 border-t border-border/40">
                  <div className="flex items-center gap-1.5">
                    <span className="text-text-muted font-bold">Akses Token:</span>
                    <span className="font-mono font-bold bg-primary-50 px-2 py-0.5 rounded text-primary-950 text-xs border border-primary-100">
                      {cls.public_token}
                    </span>
                    <button 
                      onClick={() => handleRegenerateToken(cls)}
                      className="text-primary-700 hover:text-primary-950 p-1"
                    >
                      <RefreshCw className="h-3.5 w-3.5" />
                    </button>
                  </div>

                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => toggleStatusMutation.mutate({ id: cls.id, status: !cls.is_active })}
                      className="text-text-muted"
                    >
                      {cls.is_active ? (
                        <span className="text-xs font-bold px-2 py-1 rounded bg-green-50 text-green-700 border border-green-200">Aktif</span>
                      ) : (
                        <span className="text-xs font-bold px-2 py-1 rounded bg-gray-50 text-gray-500 border border-gray-200">Nonaktif</span>
                      )}
                    </button>

                    <button
                      onClick={() => openEdit(cls)}
                      className="p-1.5 text-primary-950 hover:bg-primary-50 rounded-lg border border-border"
                    >
                      <Edit className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Add / Edit Dialog */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="relative w-full max-w-md bg-surface rounded-2xl-card shadow-2xl overflow-hidden border border-border p-6">
            <button 
              onClick={() => setIsOpen(false)}
              className="absolute top-4 right-4 p-2 rounded-xl text-text-muted hover:bg-primary-50 transition-colors"
            >
              <X className="h-6 w-6" />
            </button>

            <h3 className="text-2xl font-black text-primary-950 mb-4">
              {editingClass ? 'Edit Kelas' : 'Tambah Kelas Baru'}
            </h3>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-sm font-bold text-primary-950 block">Nama Kelas</label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: XI-1"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary-700"
                  disabled={saveMutation.isPending}
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-bold text-primary-950 block">Kode Kelas (Unique)</label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: xi-1"
                  value={code}
                  onChange={e => setCode(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary-700"
                  disabled={saveMutation.isPending || !!editingClass}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-sm font-bold text-primary-950 block">Warna Aksen</label>
                  <div className="flex gap-2 items-center">
                    <input
                      type="color"
                      value={color}
                      onChange={e => setColor(e.target.value)}
                      className="h-11 w-16 p-1 rounded-xl border border-border cursor-pointer bg-background"
                      disabled={saveMutation.isPending}
                    />
                    <span className="font-mono text-xs uppercase font-bold text-text-muted">{color}</span>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-sm font-bold text-primary-950 block">Nomor Urutan</label>
                  <input
                    type="number"
                    required
                    min="1"
                    value={sortOrder}
                    onChange={e => setSortOrder(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary-700"
                    disabled={saveMutation.isPending}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-sm font-bold text-primary-950 block">Saldo Awal (LM)</label>
                  <input
                    type="number"
                    required
                    min="0"
                    value={initialBalance}
                    onChange={e => setInitialBalance(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary-700 font-bold"
                    disabled={saveMutation.isPending || !!editingClass}
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-sm font-bold text-primary-950 block">Ikon</label>
                  <select
                    value={icon}
                    onChange={e => setIcon(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary-700"
                    disabled={saveMutation.isPending}
                  >
                    <option value="Compass">Compass</option>
                    <option value="Shield">Shield</option>
                    <option value="Award">Award</option>
                    <option value="BookOpen">BookOpen</option>
                    <option value="Users">Users</option>
                    <option value="Briefcase">Briefcase</option>
                  </select>
                </div>
              </div>

              {editingClass && (
                <div className="flex items-center gap-3 pt-2">
                  <input
                    type="checkbox"
                    id="isActiveStatus"
                    checked={isActiveStatus}
                    onChange={e => setIsActiveStatus(e.target.checked)}
                    className="h-5 w-5 accent-primary-700"
                    disabled={saveMutation.isPending}
                  />
                  <label htmlFor="isActiveStatus" className="text-sm font-bold text-primary-950 select-none">
                    Kelas Aktif (Dapat Melakukan Transaksi)
                  </label>
                </div>
              )}

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="flex-1 py-3 px-4 bg-background border border-border text-primary-950 font-bold hover:bg-primary-50 rounded-xl transition-colors"
                  disabled={saveMutation.isPending}
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="flex-1 py-3 px-4 bg-primary-950 text-white font-bold hover:bg-primary-900 rounded-xl transition-all shadow-md flex items-center justify-center gap-2"
                  disabled={saveMutation.isPending}
                >
                  {saveMutation.isPending ? (
                    <>
                      <Loader2 className="h-5 w-5 animate-spin" />
                      Menyimpan...
                    </>
                  ) : (
                    'Simpan'
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
