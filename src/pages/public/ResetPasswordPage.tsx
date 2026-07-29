import React, { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { supabase } from '../../lib/supabase/supabaseClient'
import { Loader2, ArrowLeft } from 'lucide-react'
import { toast } from 'sonner'

export const ResetPasswordPage: React.FC = () => {
  const navigate = useNavigate()
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!password || password.length < 6) {
      toast.error('Password minimal 6 karakter')
      return
    }
    setLoading(true)
    try {
      const { error } = await supabase.auth.updateUser({ password })
      if (error) throw error
      toast.success('Password Anda berhasil diperbarui!')
      navigate('/login')
    } catch (err: any) {
      console.error(err)
      toast.error(err.message || 'Gagal mereset password')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex-1 flex flex-col justify-center items-center py-12 px-4">
      <Link to="/login" className="mb-6 flex items-center gap-2 text-primary-950 font-bold">
        <ArrowLeft className="h-5 w-5" /> Kembali Ke Login
      </Link>
      <div className="w-full max-w-md bg-surface border border-border p-8 rounded-2xl-card shadow-lg text-center">
        <h2 className="text-2xl font-extrabold text-primary-950">Atur Ulang Password</h2>
        <p className="text-sm text-text-muted mt-2 mb-6">
          Masukkan password baru Anda di bawah ini
        </p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="password"
            required
            value={password}
            onChange={e => setPassword(e.target.value)}
            placeholder="Password Baru (min 6 karakter)"
            className="w-full px-4 py-3 rounded-xl border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary-700"
          />
          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-primary-950 text-white font-bold hover:bg-primary-900 rounded-xl"
          >
            {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : 'Simpan Password Baru'}
          </button>
        </form>
      </div>
    </div>
  )
}
