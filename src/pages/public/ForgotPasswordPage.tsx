import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../../lib/supabase/supabaseClient'
import { ArrowLeft, Loader2 } from 'lucide-react'
import { toast } from 'sonner'

export const ForgotPasswordPage: React.FC = () => {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email) return
    setLoading(true)
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/#/reset-password`,
      })
      if (error) throw error
      setSent(true)
      toast.success('Email pemulihan password telah dikirim!')
    } catch (err: any) {
      console.error(err)
      toast.error(err.message || 'Gagal mengirim email pemulihan')
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
        <h2 className="text-2xl font-extrabold text-primary-950">Lupa Password</h2>
        <p className="text-sm text-text-muted mt-2 mb-6">
          Masukkan alamat email Anda untuk menerima instruksi reset password
        </p>

        {sent ? (
          <div className="bg-primary-50 text-primary-950 p-4 rounded-xl border border-primary-100 text-sm">
            Tautan reset password telah dikirim ke <strong>{email}</strong>. Periksa kotak masuk atau spam email Anda.
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <input
              type="email"
              required
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="nama@email.com"
              className="w-full px-4 py-3 rounded-xl border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary-700"
            />
            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-primary-950 text-white font-bold hover:bg-primary-900 rounded-xl"
            >
              {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : 'Kirim Link Reset'}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
