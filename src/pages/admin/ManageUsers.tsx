import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase/supabaseClient'
import { 
  UserPlus, 
  X, 
  Loader2, 
  Edit, 
  ToggleLeft, 
  ToggleRight,
  Shield,
  UserCheck
} from 'lucide-react'
import { toast } from 'sonner'

interface ProfileData {
  id: string
  username: string | null
  full_name: string | null
  email: string
  role: 'admin' | 'banker'
  is_active: boolean
  created_at: string
}

export const ManageUsers: React.FC = () => {
  const queryClient = useQueryClient()
  const [isOpen, setIsOpen] = useState(false)
  const [editingProfile, setEditingProfile] = useState<ProfileData | null>(null)

  // Form states (for creating a user via sign up, or editing)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [username, setUsername] = useState('')
  const [fullName, setFullName] = useState('')
  const [role, setRole] = useState<'admin' | 'banker'>('banker')
  const [isActive, setIsActive] = useState(true)

  const { data: profiles = [], isLoading } = useQuery<ProfileData[]>({
    queryKey: ['adminUsersList'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false })
      if (error) throw error
      return data
    }
  })

  const openAdd = () => {
    setEditingProfile(null)
    setEmail('')
    setPassword('')
    setUsername('')
    setFullName('')
    setRole('banker')
    setIsActive(true)
    setIsOpen(true)
  }

  const openEdit = (prof: ProfileData) => {
    setEditingProfile(prof)
    setEmail(prof.email)
    setPassword('') // Don't edit password here
    setUsername(prof.username || '')
    setFullName(prof.full_name || '')
    setRole(prof.role)
    setIsActive(prof.is_active)
    setIsOpen(true)
  }

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (editingProfile) {
        // Edit profile
        const { error } = await supabase
          .from('profiles')
          .update({
            username: username.trim(),
            full_name: fullName.trim(),
            role,
            is_active: isActive
          })
          .eq('id', editingProfile.id)
        if (error) throw error
      } else {
        // Create new user (Sign up through Supabase Auth)
        // Note: Sign up triggers the database trigger handle_new_user which creates the profile row
        const { error } = await supabase.auth.signUp({
          email: email.trim(),
          password: password,
          options: {
            data: {
              username: username.trim(),
              full_name: fullName.trim(),
              role: role
            }
          }
        })
        if (error) throw error
        
        // If sign up succeeded but auto-sign in is active in development, it might session log,
        // but normally we restrict and wait for verification or create directly.
        toast.info('Pendaftaran user baru diproses. User harus verifikasi email jika diaktifkan.')
      }
    },
    onSuccess: () => {
      toast.success(editingProfile ? 'Akun diperbarui!' : 'User Banker berhasil didaftarkan!')
      queryClient.invalidateQueries({ queryKey: ['adminUsersList'] })
      setIsOpen(false)
    },
    onError: (err: any) => {
      toast.error(err.message || 'Gagal memproses pendaftaran/pembaruan')
    }
  })

  const toggleStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string, status: boolean }) => {
      const { error } = await supabase
        .from('profiles')
        .update({ is_active: status })
        .eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      toast.success('Status akun berhasil diubah!')
      queryClient.invalidateQueries({ queryKey: ['adminUsersList'] })
      queryClient.invalidateQueries({ queryKey: ['adminRecentActivities'] })
    },
    onError: (err: any) => {
      toast.error(err.message || 'Gagal mengubah status akun')
    }
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!fullName.trim() || (!editingProfile && (!email.trim() || !password))) {
      toast.error('Semua kolom wajib diisi!')
      return
    }
    saveMutation.mutate()
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-black text-primary-950">Kelola Akun</h2>
          <p className="text-text-muted text-sm mt-1">Daftarkan dan atur hak akses untuk Admin dan Banker kegiatan</p>
        </div>
        <button
          onClick={openAdd}
          className="inline-flex items-center gap-2 px-5 py-3 bg-primary-950 text-white font-bold hover:bg-primary-900 rounded-xl transition-colors cursor-pointer text-base shadow-sm"
        >
          <UserPlus className="h-5 w-5" /> Daftarkan Banker
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
                  <th className="p-4">Nama Lengkap</th>
                  <th className="p-4">Username</th>
                  <th className="p-4">Email</th>
                  <th className="p-4">Role</th>
                  <th className="p-4">Terdaftar Pada</th>
                  <th className="p-4 text-center">Status</th>
                  <th className="p-4 text-center">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border text-base">
                {profiles.map((prof) => (
                  <tr key={prof.id} className={`hover:bg-primary-50/20 ${!prof.is_active ? 'opacity-65 bg-gray-50/50' : ''}`}>
                    <td className="p-4">
                      <div className="flex items-center gap-2.5">
                        <div className="bg-primary-100 text-primary-950 p-2 rounded-full font-bold text-sm h-8 w-8 flex items-center justify-center">
                          {(prof.full_name || 'U').charAt(0).toUpperCase()}
                        </div>
                        <span className="font-extrabold text-primary-950">{prof.full_name || '-'}</span>
                      </div>
                    </td>
                    <td className="p-4 font-semibold text-text-muted">{prof.username || '-'}</td>
                    <td className="p-4 font-semibold text-text-muted">{prof.email}</td>
                    <td className="p-4">
                      <span className={`inline-flex items-center gap-1 text-xs font-extrabold px-2.5 py-1 rounded-full uppercase border ${
                        prof.role === 'admin' 
                          ? 'bg-blue-50 text-blue-800 border-blue-200' 
                          : 'bg-green-50 text-green-800 border-green-200'
                      }`}>
                        {prof.role === 'admin' ? <Shield className="h-3 w-3" /> : <UserCheck className="h-3 w-3" />}
                        {prof.role}
                      </span>
                    </td>
                    <td className="p-4 text-sm text-text-muted font-medium">
                      {new Date(prof.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
                    </td>
                    <td className="p-4 text-center">
                      <button
                        onClick={() => toggleStatusMutation.mutate({ id: prof.id, status: !prof.is_active })}
                        className="mx-auto block text-text-muted hover:text-primary-950"
                      >
                        {prof.is_active ? (
                          <ToggleRight className="h-8 w-8 text-primary-800" />
                        ) : (
                          <ToggleLeft className="h-8 w-8 text-gray-400" />
                        )}
                      </button>
                    </td>
                    <td className="p-4 text-center">
                      <button
                        onClick={() => openEdit(prof)}
                        className="p-2 rounded-xl text-primary-950 hover:bg-primary-50 transition-colors border border-border"
                        title="Edit Profil"
                      >
                        <Edit className="h-4.5 w-4.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile Card Layout */}
          <div className="md:hidden divide-y divide-border">
            {profiles.map((prof) => (
              <div key={prof.id} className={`p-4 space-y-3 ${!prof.is_active ? 'opacity-65 bg-gray-50/50' : ''}`}>
                <div className="flex justify-between items-start">
                  <div className="flex items-center gap-2">
                    <div className="bg-primary-100 text-primary-950 font-bold p-2 h-8 w-8 flex items-center justify-center rounded-full text-xs shrink-0">
                      {(prof.full_name || 'U').charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <span className="font-extrabold text-primary-950 block leading-tight">{prof.full_name || '-'}</span>
                      <span className="text-xs text-text-muted font-medium block mt-0.5">@{prof.username || '-'} • {prof.email}</span>
                    </div>
                  </div>
                  <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full uppercase border ${
                    prof.role === 'admin' 
                      ? 'bg-blue-50 text-blue-800 border-blue-200' 
                      : 'bg-green-50 text-green-800 border-green-200'
                  }`}>
                    {prof.role}
                  </span>
                </div>

                <div className="flex items-center justify-between text-sm pt-2 border-t border-border/40">
                  <span className="text-xs text-text-muted">
                    Daftar: {new Date(prof.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}
                  </span>

                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => toggleStatusMutation.mutate({ id: prof.id, status: !prof.is_active })}
                      className="text-text-muted"
                    >
                      {prof.is_active ? (
                        <span className="text-xs font-bold px-2 py-1 rounded bg-green-50 text-green-700 border border-green-200">Aktif</span>
                      ) : (
                        <span className="text-xs font-bold px-2 py-1 rounded bg-gray-50 text-gray-500 border border-gray-200">Nonaktif</span>
                      )}
                    </button>

                    <button
                      onClick={() => openEdit(prof)}
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
              {editingProfile ? 'Edit Akun' : 'Daftarkan Banker Baru'}
            </h3>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-sm font-bold text-primary-950 block">Nama Lengkap</label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Ahmad Banker"
                  value={fullName}
                  onChange={e => setFullName(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary-700"
                  disabled={saveMutation.isPending}
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-bold text-primary-950 block">Username (Untuk Login)</label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: ahmad"
                  value={username}
                  onChange={e => setUsername(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary-700"
                  disabled={saveMutation.isPending}
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-bold text-primary-950 block">Email</label>
                <input
                  type="email"
                  required
                  placeholder="ahmad@domain.com"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary-700"
                  disabled={saveMutation.isPending || !!editingProfile}
                />
              </div>

              {!editingProfile && (
                <div className="space-y-1.5">
                  <label className="text-sm font-bold text-primary-950 block">Password Awal (min 6 karakter)</label>
                  <input
                    type="password"
                    required
                    placeholder="******"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary-700"
                    disabled={saveMutation.isPending}
                  />
                </div>
              )}

              <div className="space-y-1.5">
                <label className="text-sm font-bold text-primary-950 block">Role Hak Akses</label>
                <select
                  value={role}
                  onChange={e => setRole(e.target.value as any)}
                  className="w-full px-4 py-3 rounded-xl border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary-700 font-bold"
                  disabled={saveMutation.isPending}
                >
                  <option value="banker">Banker (Hanya Transaksi & Riwayat)</option>
                  <option value="admin">Admin (Akses Penuh Pengaturan & Saldo)</option>
                </select>
              </div>

              {editingProfile && (
                <div className="flex items-center gap-3 pt-2">
                  <input
                    type="checkbox"
                    id="isActiveStatus"
                    checked={isActive}
                    onChange={e => setIsActive(e.target.checked)}
                    className="h-5 w-5 accent-primary-700"
                    disabled={saveMutation.isPending}
                  />
                  <label htmlFor="isActiveStatus" className="text-sm font-bold text-primary-950 select-none">
                    Akun Aktif (Dapat Melakukan Login)
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
                      Memproses...
                    </>
                  ) : (
                    'Simpan Akun'
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
