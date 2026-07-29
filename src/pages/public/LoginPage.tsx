import React, { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as zod from 'zod'
import { supabase } from '../../lib/supabase/supabaseClient'
import { Coins, Eye, EyeOff, Loader2, AlertCircle, ArrowLeft } from 'lucide-react'
import { toast } from 'sonner'

const loginSchema = zod.object({
  identifier: zod.string().min(3, { message: 'Username atau Email minimal 3 karakter' }),
  password: zod.string().min(6, { message: 'Password minimal 6 karakter' })
})

type LoginFormValues = zod.infer<typeof loginSchema>

export const LoginPage: React.FC = () => {
  const navigate = useNavigate()
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')

  const { register, handleSubmit, formState: { errors } } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema)
  })

  const onSubmit = async (values: LoginFormValues) => {
    setLoading(true)
    setErrorMsg('')
    
    try {
      let resolvedEmail = values.identifier.trim()

      // If it doesn't look like an email, fetch corresponding email from profiles by username
      if (!resolvedEmail.includes('@')) {
        const { data: profile, error: profileErr } = await supabase
          .from('profiles')
          .select('email')
          .eq('username', resolvedEmail)
          .maybeSingle()

        if (profileErr) throw profileErr
        if (!profile) {
          throw new Error('Username tidak ditemukan.')
        }
        resolvedEmail = profile.email
      }

      const { data, error } = await supabase.auth.signInWithPassword({
        email: resolvedEmail,
        password: values.password
      })

      if (error) throw error

      if (data?.user) {
        // Fetch profile to see role
        const { data: profile, error: profileErr } = await supabase
          .from('profiles')
          .select('role, is_active')
          .eq('id', data.user.id)
          .single()

        if (profileErr) throw profileErr

        if (profile) {
          if (!profile.is_active) {
            await supabase.auth.signOut()
            throw new Error('Akun Anda dinonaktifkan. Hubungi Admin.')
          }

          toast.success('Login berhasil!')
          if (profile.role === 'admin') {
            navigate('/admin/dashboard')
          } else {
            navigate('/banker/dashboard')
          }
        } else {
          await supabase.auth.signOut()
          throw new Error('Profil pengguna tidak ditemukan.')
        }
      }
    } catch (err: any) {
      console.error('Login error:', err)
      setErrorMsg(err.message || 'Login gagal. Periksa kembali akun dan password Anda.')
      toast.error('Gagal Login')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex-1 flex flex-col justify-center items-center py-12 px-4 bg-background">
      <Link 
        to="/" 
        className="mb-6 flex items-center gap-2 text-primary-950 font-bold hover:text-primary-800 transition-colors"
      >
        <ArrowLeft className="h-5 w-5" /> Kembali Ke Awal
      </Link>

      <div className="w-full max-w-md bg-surface rounded-2xl-card shadow-lg p-8 border border-border">
        {/* Branding header */}
        <div className="text-center mb-8">
          <div className="mx-auto bg-primary-950 text-white p-4 rounded-2xl w-14 h-14 flex items-center justify-center mb-4 shadow-sm">
            <Coins className="h-7 w-7" />
          </div>
          <h2 className="text-3xl font-black text-primary-950">Masuk Aplikasi</h2>
          <p className="text-text-muted text-sm mt-2">
            Gunakan akun Admin atau Banker yang terdaftar
          </p>
        </div>

        {/* Error notice */}
        {errorMsg && (
          <div className="mb-6 flex items-start gap-2.5 bg-red-50 text-red-700 p-4 rounded-xl text-sm font-semibold border border-red-200">
            <AlertCircle className="h-5 w-5 shrink-0 text-red-600" />
            <p className="leading-tight">{errorMsg}</p>
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          {/* Identifier field */}
          <div className="space-y-1.5">
            <label className="text-sm font-bold text-primary-950 block">Username atau Email</label>
            <input
              type="text"
              {...register('identifier')}
              placeholder="Masukkan username atau email"
              className="w-full px-4 py-3 rounded-xl border border-border focus:outline-none focus:ring-2 focus:ring-primary-700 bg-background text-base"
              disabled={loading}
            />
            {errors.identifier && (
              <p className="text-xs font-bold text-red-600 mt-1">{errors.identifier.message}</p>
            )}
          </div>

          {/* Password field */}
          <div className="space-y-1.5">
            <div className="flex justify-between items-center">
              <label className="text-sm font-bold text-primary-950 block">Password</label>
              <Link 
                to="/forgot-password" 
                className="text-xs font-bold text-primary-700 hover:text-primary-950 hover:underline"
              >
                Lupa Password?
              </Link>
            </div>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                {...register('password')}
                placeholder="******"
                className="w-full px-4 py-3 pr-12 rounded-xl border border-border focus:outline-none focus:ring-2 focus:ring-primary-700 bg-background text-base"
                disabled={loading}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 flex items-center pr-3 text-text-muted hover:text-primary-950"
                disabled={loading}
              >
                {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
              </button>
            </div>
            {errors.password && (
              <p className="text-xs font-bold text-red-600 mt-1">{errors.password.message}</p>
            )}
          </div>

          {/* Submit button */}
          <button
            type="submit"
            className="w-full flex items-center justify-center gap-2 px-6 py-3.5 bg-primary-950 text-white font-bold hover:bg-primary-900 rounded-xl transition-all shadow-md cursor-pointer disabled:opacity-50 text-base"
            disabled={loading}
          >
            {loading ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" />
                Memproses Masuk...
              </>
            ) : (
              'Masuk'
            )}
          </button>
        </form>
      </div>
    </div>
  )
}
