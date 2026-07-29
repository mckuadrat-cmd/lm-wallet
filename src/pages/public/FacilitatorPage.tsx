import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase/supabaseClient'
import { CheckCircle, Loader2, Save, XCircle } from 'lucide-react'
import { toast } from 'sonner'
import { formatLM } from '../../lib/formatters/formatters'

interface ClassData {
  id: string
  name: string
  current_balance: number
}

export const FacilitatorPage: React.FC = () => {
  const queryClient = useQueryClient()
  const [classId, setClassId] = useState('')
  const [direction, setDirection] = useState<'income' | 'expense'>('income')
  const [amount, setAmount] = useState('')
  const [description, setDescription] = useState('')
  const [pin, setPin] = useState('')

  const { data: classes = [], isLoading: classesLoading } = useQuery<ClassData[]>({
    queryKey: ['publicClassesList'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('classes')
        .select('id, name, current_balance')
        .eq('is_active', true)
        .order('sort_order', { ascending: true })
      
      if (error) throw error
      return data
    }
  })

  const submitMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.rpc('create_public_transaction', {
        p_class_id: classId,
        p_direction: direction,
        p_amount: parseInt(amount, 10),
        p_description: description.trim(),
        p_pin: pin.trim()
      })

      if (error) throw error
      return data
    },
    onSuccess: () => {
      toast.success('Transaksi fasilitator berhasil disimpan!')
      queryClient.invalidateQueries({ queryKey: ['publicClassesList'] })
      // Reset form (except PIN)
      setAmount('')
      setDescription('')
      setClassId('')
    },
    onError: (err: any) => {
      toast.error(err.message || 'Gagal menyimpan transaksi, pastikan PIN benar')
    }
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!classId) {
      toast.error('Pilih kelas terlebih dahulu!')
      return
    }
    
    if (!amount || parseInt(amount, 10) <= 0) {
      toast.error('Jumlah LM harus lebih dari 0!')
      return
    }
    
    if (!description.trim()) {
      toast.error('Keterangan transaksi wajib diisi!')
      return
    }

    if (!pin.trim()) {
      toast.error('PIN Fasilitator wajib diisi!')
      return
    }

    submitMutation.mutate()
  }

  const selectedClass = classes.find(c => c.id === classId)

  return (
    <div className="max-w-2xl mx-auto w-full">
      <div className="bg-surface rounded-3xl shadow-xl border border-border p-6 sm:p-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-black text-primary-950">Fasilitator Hub</h1>
          <p className="text-text-muted mt-2 text-sm sm:text-base">
            Gunakan PIN khusus fasilitator untuk menambah atau mengurangi saldo Leadership Money kelas.
          </p>
        </div>

        {classesLoading ? (
          <div className="flex justify-center p-10">
            <Loader2 className="h-8 w-8 animate-spin text-primary-900" />
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            
            {/* Class Selection */}
            <div className="space-y-2">
              <label className="text-sm font-bold text-primary-950 block">Pilih Kelas</label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {classes.map(c => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => setClassId(c.id)}
                    className={`py-3 px-4 rounded-xl border-2 font-bold text-sm sm:text-base transition-all ${
                      classId === c.id
                        ? 'border-primary-600 bg-primary-50 text-primary-950 shadow-sm'
                        : 'border-border bg-background text-text-muted hover:bg-surface-hover'
                    }`}
                  >
                    {c.name}
                  </button>
                ))}
              </div>
              {selectedClass && (
                <p className="text-sm font-medium text-text-muted mt-2">
                  Saldo Saat Ini: <span className="font-bold text-primary-950">{formatLM(selectedClass.current_balance)} LM</span>
                </p>
              )}
            </div>

            {/* Direction Selection */}
            <div className="space-y-2">
              <label className="text-sm font-bold text-primary-950 block">Jenis Penyesuaian</label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setDirection('income')}
                  className={`flex items-center justify-center gap-2 p-4 rounded-xl border-2 transition-all ${
                    direction === 'income'
                      ? 'border-green-600 bg-green-50 text-green-900'
                      : 'border-border bg-background text-text-muted hover:bg-surface-hover'
                  }`}
                >
                  <CheckCircle className={`h-5 w-5 ${direction === 'income' ? 'text-green-600' : ''}`} />
                  <span className="font-bold">Tambah (Bonus)</span>
                </button>
                <button
                  type="button"
                  onClick={() => setDirection('expense')}
                  className={`flex items-center justify-center gap-2 p-4 rounded-xl border-2 transition-all ${
                    direction === 'expense'
                      ? 'border-red-600 bg-red-50 text-red-900'
                      : 'border-border bg-background text-text-muted hover:bg-surface-hover'
                  }`}
                >
                  <XCircle className={`h-5 w-5 ${direction === 'expense' ? 'text-red-600' : ''}`} />
                  <span className="font-bold">Kurangi (Denda)</span>
                </button>
              </div>
            </div>

            {/* Amount */}
            <div className="space-y-2">
              <label className="text-sm font-bold text-primary-950 block">Jumlah LM</label>
              <div className="relative">
                <input
                  type="number"
                  required
                  min="1"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="w-full px-5 py-4 text-xl rounded-xl border-2 border-border bg-background focus:outline-none focus:border-primary-600 focus:ring-4 focus:ring-primary-100 font-bold"
                  placeholder="0"
                  disabled={submitMutation.isPending}
                />
                <span className="absolute right-5 top-1/2 -translate-y-1/2 font-black text-text-muted">
                  LM
                </span>
              </div>
            </div>

            {/* Description */}
            <div className="space-y-2">
              <label className="text-sm font-bold text-primary-950 block">Keterangan Transaksi</label>
              <input
                type="text"
                required
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full px-5 py-4 rounded-xl border-2 border-border bg-background focus:outline-none focus:border-primary-600 focus:ring-4 focus:ring-primary-100 font-bold"
                placeholder="Contoh: Datang tepat waktu / Menang game"
                disabled={submitMutation.isPending}
              />
            </div>

            {/* PIN */}
            <div className="space-y-2 border-t border-border pt-6 mt-6">
              <label className="text-sm font-bold text-primary-950 block text-center">PIN Fasilitator</label>
              <input
                type="password"
                required
                value={pin}
                onChange={(e) => setPin(e.target.value)}
                className="w-full px-5 py-4 text-center tracking-widest text-2xl rounded-xl border-2 border-border bg-background focus:outline-none focus:border-primary-600 focus:ring-4 focus:ring-primary-100 font-bold"
                placeholder="******"
                disabled={submitMutation.isPending}
              />
            </div>

            {/* Submit Button */}
            <div className="pt-4">
              <button
                type="submit"
                disabled={submitMutation.isPending}
                className="w-full py-4 bg-primary-950 text-white font-black text-lg rounded-xl hover:bg-primary-900 transition-all shadow-xl shadow-primary-900/20 active:scale-[0.98] flex justify-center items-center gap-2"
              >
                {submitMutation.isPending ? (
                  <>
                    <Loader2 className="h-6 w-6 animate-spin" />
                    Memproses...
                  </>
                ) : (
                  <>
                    <Save className="h-6 w-6" />
                    Simpan Transaksi
                  </>
                )}
              </button>
            </div>
            
          </form>
        )}
      </div>
    </div>
  )
}
