import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase/supabaseClient'
import { 
  CreditCard, 
  Loader2, 
  X, 
  AlertTriangle,
  QrCode
} from 'lucide-react'
import { toast } from 'sonner'
import { QRCodeSVG as QRCode } from 'qrcode.react'

interface CardData {
  id: string
  class_id: string
  rfid_uid: string | null
  qr_token: string
  status: 'active' | 'inactive' | 'lost'
  last_used_at: string | null
  class: { name: string }
}

export const ManageCards: React.FC = () => {
  const queryClient = useQueryClient()
  const [selectedCard, setSelectedCard] = useState<CardData | null>(null)
  
  // Dialog states
  const [rfidOpen, setRfidOpen] = useState(false)
  const [newRfid, setNewRfid] = useState('')
  const [statusOpen, setStatusOpen] = useState(false)
  const [showQrOpen, setShowQrOpen] = useState(false)
  const [newStatus, setNewStatus] = useState<'active' | 'inactive' | 'lost'>('active')

  const { data: cards = [], isLoading } = useQuery<CardData[]>({
    queryKey: ['adminCardsList'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('class_cards')
        .select(`
          *,
          class:classes(name)
        `)
      if (error) throw error
      return data.map((c: any) => ({
        ...c,
        class: c.class ? { name: c.class.name } : { name: 'Unknown' }
      }))
    }
  })

  // Mutations
  // 1. Update RFID UID
  const updateRfidMutation = useMutation({
    mutationFn: async ({ cardId, rfid }: { cardId: string, rfid: string | null }) => {
      const val = rfid?.trim() || null
      const { error } = await supabase
        .from('class_cards')
        .update({ rfid_uid: val })
        .eq('id', cardId)
      if (error) throw error
    },
    onSuccess: () => {
      toast.success('RFID kartu berhasil diperbarui!')
      queryClient.invalidateQueries({ queryKey: ['adminCardsList'] })
      setRfidOpen(false)
      setSelectedCard(null)
      setNewRfid('')
    },
    onError: (err: any) => {
      toast.error(err.message || 'Gagal memperbarui RFID (RFID UID mungkin sudah terpakai)')
    }
  })

  // 2. Update Card Status
  const updateStatusMutation = useMutation({
    mutationFn: async ({ cardId, status }: { cardId: string, status: 'active' | 'inactive' | 'lost' }) => {
      const { error } = await supabase
        .from('class_cards')
        .update({ status })
        .eq('id', cardId)
      if (error) throw error
    },
    onSuccess: () => {
      toast.success('Status kartu berhasil diperbarui!')
      queryClient.invalidateQueries({ queryKey: ['adminCardsList'] })
      setStatusOpen(false)
      setSelectedCard(null)
    },
    onError: (err: any) => {
      toast.error(err.message || 'Gagal mengubah status kartu')
    }
  })

  const handleRfidSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedCard) return
    updateRfidMutation.mutate({
      cardId: selectedCard.id,
      rfid: newRfid
    })
  }

  const handleStatusSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedCard) return
    updateStatusMutation.mutate({
      cardId: selectedCard.id,
      status: newStatus
    })
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-50 text-income border-green-200'
      case 'inactive': return 'bg-gray-100 text-gray-500 border-gray-200'
      case 'lost': return 'bg-red-50 text-red-600 border-red-200'
      default: return 'bg-gray-50 text-gray-700'
    }
  }

  const formatLastUsed = (dateStr: string | null) => {
    if (!dateStr) return 'Belum pernah digunakan'
    const date = new Date(dateStr)
    return `${date.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}, ${date.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}`
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-black text-primary-950">Kartu RFID & QR</h2>
        <p className="text-text-muted text-sm mt-1">Kelola tautan kartu fisik RFID dan token QR Code untuk masing-masing kelas</p>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center p-12 bg-surface rounded-2xl-card border border-border">
          <Loader2 className="h-8 w-8 animate-spin text-primary-900" />
        </div>
      ) : (
        <div className="bg-surface rounded-2xl-card border border-border shadow-xs overflow-hidden">
          {/* Desktop Table */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-primary-50/50 border-b border-border text-primary-950 font-bold text-xs">
                  <th className="p-4">Kelas</th>
                  <th className="p-4">RFID UID</th>
                  <th className="p-4">QR Token</th>
                  <th className="p-4">Terakhir Digunakan</th>
                  <th className="p-4 text-center">Status</th>
                  <th className="p-4 text-center">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border text-base">
                {cards.map((card) => (
                  <tr key={card.id} className="hover:bg-primary-50/20">
                    <td className="p-4 font-extrabold text-primary-950">{card.class.name}</td>
                    <td className="p-4">
                      {card.rfid_uid ? (
                        <span className="font-mono font-bold bg-primary-100 px-3 py-1 rounded-lg text-primary-950 border border-primary-200">
                          {card.rfid_uid}
                        </span>
                      ) : (
                        <span className="text-xs text-text-muted italic">Belum terhubung</span>
                      )}
                    </td>
                    <td className="p-4">
                      <span className="font-mono font-bold bg-gray-50 px-3 py-1 rounded-lg text-text-muted border border-border">
                        {card.qr_token}
                      </span>
                    </td>
                    <td className="p-4 text-sm text-text-muted font-medium">
                      {formatLastUsed(card.last_used_at)}
                    </td>
                    <td className="p-4 text-center">
                      <span className={`text-xs font-bold px-2.5 py-1 rounded-full uppercase border ${getStatusBadge(card.status)}`}>
                        {card.status === 'active' ? 'Aktif' : card.status === 'lost' ? 'Hilang' : 'Nonaktif'}
                      </span>
                    </td>
                    <td className="p-4 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => {
                            setSelectedCard(card)
                            setNewRfid(card.rfid_uid || '')
                            setRfidOpen(true)
                          }}
                          className="px-3 py-2 text-xs font-bold bg-primary-50 text-primary-950 rounded-xl hover:bg-primary-100 transition-colors border border-primary-100 flex items-center gap-1"
                        >
                          <CreditCard className="h-3.5 w-3.5" /> Set RFID
                        </button>
                        <button
                          onClick={() => {
                            setSelectedCard(card)
                            setShowQrOpen(true)
                          }}
                          className="px-3 py-2 text-xs font-bold bg-white text-primary-950 rounded-xl hover:bg-primary-50 transition-colors border border-border flex items-center gap-1"
                        >
                          <QrCode className="h-3.5 w-3.5" /> Lihat QR
                        </button>
                        <button
                          onClick={() => {
                            setSelectedCard(card)
                            setNewStatus(card.status)
                            setStatusOpen(true)
                          }}
                          className="px-3 py-2 text-xs font-bold bg-background text-primary-950 rounded-xl hover:bg-primary-50 transition-colors border border-border"
                        >
                          Ubah Status
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
            {cards.map((card) => (
              <div key={card.id} className="p-4 space-y-3">
                <div className="flex justify-between items-start">
                  <div>
                    <span className="text-lg font-black text-primary-950">{card.class.name}</span>
                    <span className="text-xs text-text-muted block mt-1">Terakhir: {formatLastUsed(card.last_used_at)}</span>
                  </div>
                  <span className={`text-xs font-bold px-2 py-0.5 rounded uppercase border ${getStatusBadge(card.status)}`}>
                    {card.status === 'active' ? 'Aktif' : card.status === 'lost' ? 'Hilang' : 'Nonaktif'}
                  </span>
                </div>

                <div className="bg-background p-3 rounded-xl border border-border space-y-2 text-sm">
                  <div className="flex justify-between items-center">
                    <span className="text-text-muted font-bold">RFID UID:</span>
                    {card.rfid_uid ? (
                      <span className="font-mono font-bold bg-primary-50 px-2 py-0.5 rounded text-primary-950 text-xs border border-primary-100">{card.rfid_uid}</span>
                    ) : (
                      <span className="text-xs text-text-muted italic">Belum terhubung</span>
                    )}
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-text-muted font-bold">QR Token:</span>
                    <span className="font-mono font-bold text-xs text-text-muted">{card.qr_token}</span>
                  </div>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      setSelectedCard(card)
                      setNewRfid(card.rfid_uid || '')
                      setRfidOpen(true)
                    }}
                    className="flex-1 py-2 text-xs font-bold bg-primary-50 text-primary-950 rounded-xl border border-primary-100 flex items-center justify-center gap-1"
                  >
                    <CreditCard className="h-4 w-4" /> Set RFID
                  </button>
                  <button
                    onClick={() => {
                      setSelectedCard(card)
                      setShowQrOpen(true)
                    }}
                    className="flex-1 py-2 text-xs font-bold bg-white text-primary-950 rounded-xl border border-border flex items-center justify-center gap-1"
                  >
                    <QrCode className="h-4 w-4" /> QR Code
                  </button>
                  <button
                    onClick={() => {
                      setSelectedCard(card)
                      setNewStatus(card.status)
                      setStatusOpen(true)
                    }}
                    className="flex-1 py-2 text-xs font-bold bg-background text-primary-950 rounded-xl border border-border"
                  >
                    Ubah Status
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Set RFID Dialog */}
      {rfidOpen && selectedCard && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="relative w-full max-w-md bg-surface rounded-2xl-card shadow-2xl overflow-hidden border border-border p-6">
            <button 
              onClick={() => { setRfidOpen(false); setSelectedCard(null); }}
              className="absolute top-4 right-4 p-2 rounded-xl text-text-muted hover:bg-primary-50 transition-colors"
            >
              <X className="h-6 w-6" />
            </button>

            <h3 className="text-2xl font-black text-primary-950 mb-2">Tautkan RFID</h3>
            <p className="text-sm text-text-muted mb-4">
              Menghubungkan kartu RFID UID dengan kelas <strong className="text-primary-950">{selectedCard.class.name}</strong>.
            </p>

            <form onSubmit={handleRfidSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-sm font-bold text-primary-950 block">RFID UID (Ketik manual / Tap di sensor)</label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: 0008237129"
                  value={newRfid}
                  onChange={e => setNewRfid(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary-700 text-lg font-mono font-bold text-center"
                  disabled={updateRfidMutation.isPending}
                  autoFocus
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => { setRfidOpen(false); setSelectedCard(null); }}
                  className="flex-1 py-3 px-4 bg-background border border-border text-primary-950 font-bold hover:bg-primary-50 rounded-xl transition-colors"
                  disabled={updateRfidMutation.isPending}
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="flex-1 py-3 px-4 bg-primary-950 text-white font-bold hover:bg-primary-900 rounded-xl transition-all shadow-md flex items-center justify-center gap-2"
                  disabled={updateRfidMutation.isPending}
                >
                  {updateRfidMutation.isPending ? <Loader2 className="h-5 w-5 animate-spin" /> : 'Simpan RFID'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Change Status Dialog */}
      {statusOpen && selectedCard && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="relative w-full max-w-md bg-surface rounded-2xl-card shadow-2xl overflow-hidden border border-border p-6">
            <button 
              onClick={() => { setStatusOpen(false); setSelectedCard(null); }}
              className="absolute top-4 right-4 p-2 rounded-xl text-text-muted hover:bg-primary-50 transition-colors"
            >
              <X className="h-6 w-6" />
            </button>

            <h3 className="text-2xl font-black text-primary-950 mb-2">Ubah Status Kartu</h3>
            <p className="text-sm text-text-muted mb-4">
              Ubah status operasional kartu kelas <strong className="text-primary-950">{selectedCard.class.name}</strong>.
            </p>

            <form onSubmit={handleStatusSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-sm font-bold text-primary-950 block">Status Kartu</label>
                <select
                  value={newStatus}
                  onChange={e => setNewStatus(e.target.value as any)}
                  className="w-full px-4 py-3 rounded-xl border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary-700 font-bold"
                  disabled={updateStatusMutation.isPending}
                >
                  <option value="active">Aktif (Dapat digunakan)</option>
                  <option value="inactive">Nonaktif (Diblokir sementara)</option>
                  <option value="lost">Hilang (Diblokir permanen / kartu hilang)</option>
                </select>
              </div>

              {newStatus === 'lost' && (
                <div className="flex items-start gap-2 bg-red-50 text-red-700 p-3.5 rounded-xl border border-red-150 text-xs">
                  <AlertTriangle className="h-5 w-5 shrink-0 text-red-600" />
                  <p className="leading-tight">
                    <strong>PERINGATAN:</strong> Kartu yang ditandai Hilang tidak dapat digunakan untuk memindai kelas. Hubungi Admin jika kartu ditemukan kembali.
                  </p>
                </div>
              )}

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => { setStatusOpen(false); setSelectedCard(null); }}
                  className="flex-1 py-3 px-4 bg-background border border-border text-primary-950 font-bold hover:bg-primary-50 rounded-xl transition-colors"
                  disabled={updateStatusMutation.isPending}
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="flex-1 py-3 px-4 bg-primary-950 text-white font-bold hover:bg-primary-900 rounded-xl transition-all shadow-md flex items-center justify-center gap-2"
                  disabled={updateStatusMutation.isPending}
                >
                  {updateStatusMutation.isPending ? <Loader2 className="h-5 w-5 animate-spin" /> : 'Simpan Status'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* View QR Code Dialog */}
      {showQrOpen && selectedCard && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="relative w-full max-w-sm bg-surface rounded-2xl-card shadow-2xl overflow-hidden border border-border p-6">
            <button 
              onClick={() => setShowQrOpen(false)}
              className="absolute top-4 right-4 p-2 rounded-xl text-text-muted hover:bg-primary-50 transition-colors"
            >
              <X className="h-6 w-6" />
            </button>
            <h3 className="text-2xl font-black text-primary-950 mb-2 text-center">
              QR Code {selectedCard.class.name}
            </h3>
            <p className="text-text-muted text-sm text-center mb-6">
              Token: <span className="font-mono font-bold">{selectedCard.qr_token}</span>
            </p>
            <div className="flex justify-center bg-white p-4 rounded-xl border border-border">
              <QRCode 
                value={selectedCard.qr_token} 
                size={220}
                level="M"
                includeMargin={true}
              />
            </div>
            <p className="text-xs text-text-muted text-center mt-4 font-medium">
              Gunakan fitur klik-kanan lalu <strong>Save image as...</strong> atau Print layar ini untuk mencetak QR Code.
            </p>
            <div className="mt-6">
              <button
                onClick={() => setShowQrOpen(false)}
                className="w-full py-3 bg-primary-950 text-white font-bold rounded-xl hover:bg-primary-900 transition-colors"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
