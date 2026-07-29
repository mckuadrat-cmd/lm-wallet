import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase/supabaseClient'
import { formatLM } from '../../lib/formatters/formatters'
import { 
  Award, 
  Edit, 
  Trash2, 
  X, 
  Loader2, 
  PlusCircle, 
  ToggleLeft,
  ToggleRight
} from 'lucide-react'
import { toast } from 'sonner'

interface MissionData {
  id: string
  name: string
  description: string | null
  reward_amount: number
  is_active: boolean
  sort_order: number
}

export const ManageMissions: React.FC = () => {
  const queryClient = useQueryClient()
  const [isOpen, setIsOpen] = useState(false)
  const [editingMission, setEditingMission] = useState<MissionData | null>(null)

  // Form states
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [rewardAmount, setRewardAmount] = useState('100')
  const [sortOrder, setSortOrder] = useState('1')
  const [isActiveStatus, setIsActiveStatus] = useState(true)

  const { data: missions = [], isLoading } = useQuery<MissionData[]>({
    queryKey: ['adminMissionsList'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('missions')
        .select('*')
        .order('sort_order', { ascending: true })
      if (error) throw error
      return data.map(m => ({
        ...m,
        reward_amount: Number(m.reward_amount)
      }))
    }
  })

  const openAdd = () => {
    setEditingMission(null)
    setName('')
    setDescription('')
    setRewardAmount('100')
    setSortOrder((missions.length + 1).toString())
    setIsActiveStatus(true)
    setIsOpen(true)
  }

  const openEdit = (mis: MissionData) => {
    setEditingMission(mis)
    setName(mis.name)
    setDescription(mis.description || '')
    setRewardAmount(mis.reward_amount.toString())
    setSortOrder(mis.sort_order.toString())
    setIsActiveStatus(mis.is_active)
    setIsOpen(true)
  }

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        name: name.trim(),
        description: description.trim() || null,
        reward_amount: parseInt(rewardAmount) || 0,
        sort_order: parseInt(sortOrder) || 0,
        is_active: isActiveStatus
      }

      if (editingMission) {
        const { error } = await supabase
          .from('missions')
          .update(payload)
          .eq('id', editingMission.id)
        if (error) throw error
      } else {
        const { error } = await supabase
          .from('missions')
          .insert(payload)
        if (error) throw error
      }
    },
    onSuccess: () => {
      toast.success(editingMission ? 'Misi diperbarui!' : 'Misi ditambahkan!')
      queryClient.invalidateQueries({ queryKey: ['adminMissionsList'] })
      setIsOpen(false)
    },
    onError: (err: any) => {
      toast.error(err.message || 'Gagal menyimpan misi')
    }
  })

  const toggleStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string, status: boolean }) => {
      const { error } = await supabase
        .from('missions')
        .update({ is_active: status })
        .eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      toast.success('Status misi berhasil diubah!')
      queryClient.invalidateQueries({ queryKey: ['adminMissionsList'] })
    },
    onError: (err: any) => {
      toast.error(err.message || 'Gagal mengubah status')
    }
  })

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('missions').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      toast.success('Misi berhasil dihapus!')
      queryClient.invalidateQueries({ queryKey: ['adminMissionsList'] })
    },
    onError: (err: any) => {
      toast.error(err.message || 'Misi ini mungkin sudah memiliki riwayat transaksi, tidak dapat dihapus.')
    }
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim() || !rewardAmount) {
      toast.error('Nama misi dan jumlah hadiah wajib diisi!')
      return
    }
    saveMutation.mutate()
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-black text-primary-950">Kelola Misi</h2>
          <p className="text-text-muted text-sm mt-1">Atur daftar misi dan jumlah hadiah Leadership Money (LM) bagi kelas</p>
        </div>
        <button
          onClick={openAdd}
          className="inline-flex items-center gap-2 px-5 py-3 bg-primary-950 text-white font-bold hover:bg-primary-900 rounded-xl transition-colors cursor-pointer text-base shadow-sm"
        >
          <PlusCircle className="h-5 w-5" /> Tambah Misi
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
                <tr className="bg-primary-50/50 border-b border-border text-primary-950 font-bold text-xs">
                  <th className="p-4 w-12 text-center">No</th>
                  <th className="p-4">Nama Misi</th>
                  <th className="p-4">Keterangan / Deskripsi</th>
                  <th className="p-4">Hadiah Misi</th>
                  <th className="p-4 text-center">Status</th>
                  <th className="p-4 text-center">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border text-base">
                {missions.map((mis) => (
                  <tr key={mis.id} className={`hover:bg-primary-50/20 ${!mis.is_active ? 'opacity-65 bg-gray-50/50' : ''}`}>
                    <td className="p-4 text-center font-bold text-text-muted">{mis.sort_order}</td>
                    <td className="p-4">
                      <div className="flex items-center gap-2">
                        <Award className="h-5 w-5 text-primary-750 shrink-0" />
                        <span className="font-extrabold text-primary-950">{mis.name}</span>
                      </div>
                    </td>
                    <td className="p-4 text-sm text-text-muted font-medium max-w-sm truncate" title={mis.description || ''}>
                      {mis.description || '-'}
                    </td>
                    <td className="p-4 font-black text-income">{formatLM(mis.reward_amount)}</td>
                    <td className="p-4 text-center">
                      <button
                        onClick={() => toggleStatusMutation.mutate({ id: mis.id, status: !mis.is_active })}
                        className="mx-auto block text-text-muted hover:text-primary-950"
                      >
                        {mis.is_active ? (
                          <ToggleRight className="h-8 w-8 text-primary-800" />
                        ) : (
                          <ToggleLeft className="h-8 w-8 text-gray-400" />
                        )}
                      </button>
                    </td>
                    <td className="p-4 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => openEdit(mis)}
                          className="p-2 rounded-xl text-primary-950 hover:bg-primary-50 transition-colors border border-border"
                          title="Edit Misi"
                        >
                          <Edit className="h-4.5 w-4.5" />
                        </button>
                        <button
                          onClick={() => {
                            if (window.confirm('Hapus misi ini?')) {
                              deleteMutation.mutate(mis.id)
                            }
                          }}
                          className="p-2 rounded-xl text-red-650 hover:bg-red-50 transition-colors border border-border"
                          title="Hapus Misi"
                        >
                          <Trash2 className="h-4.5 w-4.5" />
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
            {missions.map((mis) => (
              <div key={mis.id} className={`p-4 space-y-3 ${!mis.is_active ? 'opacity-65 bg-gray-50/50' : ''}`}>
                <div className="flex justify-between items-start">
                  <div className="flex items-start gap-2">
                    <Award className="h-5 w-5 text-primary-750 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-extrabold text-primary-950 block">{mis.name}</span>
                      <span className="text-xs text-text-muted font-medium block mt-0.5">{mis.description || 'Tidak ada deskripsi'}</span>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="text-lg font-black text-income">{formatLM(mis.reward_amount)}</span>
                    <span className="text-[10px] font-semibold text-text-muted block mt-0.5">Urutan: {mis.sort_order}</span>
                  </div>
                </div>

                <div className="flex items-center justify-between text-sm pt-2 border-t border-border/40">
                  <span className="text-xs text-text-muted">ID: {mis.id.substring(0, 8)}</span>
                  
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => toggleStatusMutation.mutate({ id: mis.id, status: !mis.is_active })}
                      className="text-text-muted"
                    >
                      {mis.is_active ? (
                        <span className="text-xs font-bold px-2 py-1 rounded bg-green-50 text-green-700 border border-green-200">Aktif</span>
                      ) : (
                        <span className="text-xs font-bold px-2 py-1 rounded bg-gray-50 text-gray-500 border border-gray-200">Nonaktif</span>
                      )}
                    </button>

                    <button
                      onClick={() => openEdit(mis)}
                      className="p-1.5 text-primary-950 hover:bg-primary-50 rounded-lg border border-border"
                    >
                      <Edit className="h-4 w-4" />
                    </button>

                    <button
                      onClick={() => {
                        if (window.confirm('Hapus misi ini?')) {
                          deleteMutation.mutate(mis.id)
                        }
                      }}
                      className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg border border-border"
                    >
                      <Trash2 className="h-4 w-4" />
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
              {editingMission ? 'Edit Misi' : 'Tambah Misi Baru'}
            </h3>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-sm font-bold text-primary-950 block">Nama Misi</label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Misi Ketepatan Waktu"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary-700"
                  disabled={saveMutation.isPending}
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-bold text-primary-950 block">Keterangan / Deskripsi</label>
                <textarea
                  placeholder="Deskripsi singkat jalannya misi..."
                  rows={3}
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary-700 text-sm"
                  disabled={saveMutation.isPending}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-sm font-bold text-primary-950 block">Hadiah Misi (LM)</label>
                  <input
                    type="number"
                    required
                    min="0"
                    value={rewardAmount}
                    onChange={e => setRewardAmount(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary-700 font-bold"
                    disabled={saveMutation.isPending}
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-sm font-bold text-primary-950 block">Urutan Tampil</label>
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

              {editingMission && (
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
                    Misi Aktif (Dapat Diberikan Sebagai Hadiah)
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
                    'Simpan Misi'
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
