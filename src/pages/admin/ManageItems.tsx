import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase/supabaseClient'
import { formatLM } from '../../lib/formatters/formatters'
import { 
  ShoppingBag, 
  Edit, 
  Trash2, 
  X, 
  Loader2, 
  PlusCircle, 
  ToggleLeft,
  ToggleRight
} from 'lucide-react'
import { toast } from 'sonner'

interface ItemData {
  id: string
  name: string
  category: string
  item_type: 'purchase' | 'rental'
  price: number
  unit: string
  is_active: boolean
  sort_order: number
  discount_price?: number
  stock: number | null
}

export const ManageItems: React.FC = () => {
  const queryClient = useQueryClient()
  const [isOpen, setIsOpen] = useState(false)
  const [isBulkOpen, setIsBulkOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<ItemData | null>(null)

  // Form states
  const [name, setName] = useState('')
  const [category, setCategory] = useState('Bahan Makanan')
  const [itemType, setItemType] = useState<'purchase' | 'rental'>('purchase')
  const [price, setPrice] = useState('50')
  const [discountPrice, setDiscountPrice] = useState('0')
  const [stock, setStock] = useState('')
  const [unit, setUnit] = useState('liter')
  const [bulkAmount, setBulkAmount] = useState('')
  const [sortOrder, setSortOrder] = useState('1')
  const [isActiveStatus, setIsActiveStatus] = useState(true)

  const categories = [
    'Bahan Makanan',
    'Minuman',
    'Peralatan Masak',
    'Kamar',
    'Perlengkapan',
    'Sewa',
    'Lainnya'
  ]

  const { data: items = [], isLoading } = useQuery<ItemData[]>({
    queryKey: ['adminItemsList'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('items')
        .select('*')
        .order('sort_order', { ascending: true })
      if (error) throw error
      return data.map(i => ({
        ...i,
        price: Number(i.price)
      }))
    }
  })

  const openAdd = () => {
    setEditingItem(null)
    setName('')
    setCategory('Bahan Makanan')
    setItemType('purchase')
    setPrice('50')
    setDiscountPrice('0')
    setStock('')
    setUnit('liter')
    setSortOrder((items.length + 1).toString())
    setIsActiveStatus(true)
    setIsOpen(true)
  }

  const openEdit = (itm: ItemData) => {
    setEditingItem(itm)
    setName(itm.name)
    setCategory(itm.category)
    setItemType(itm.item_type)
    setPrice(itm.price.toString())
    setDiscountPrice(itm.discount_price ? itm.discount_price.toString() : '0')
    setStock(itm.stock !== null ? itm.stock.toString() : '')
    setUnit(itm.unit)
    setSortOrder(itm.sort_order.toString())
    setIsActiveStatus(itm.is_active)
    setIsOpen(true)
  }

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        name: name.trim(),
        category,
        item_type: itemType,
        price: parseInt(price) || 0,
        discount_price: parseInt(discountPrice) || 0,
        stock: stock.trim() ? parseInt(stock) : null,
        unit: unit.trim().toLowerCase(),
        sort_order: parseInt(sortOrder) || 0,
        is_active: isActiveStatus
      }

      if (editingItem) {
        const { error } = await supabase
          .from('items')
          .update(payload)
          .eq('id', editingItem.id)
        if (error) throw error
      } else {
        const { error } = await supabase
          .from('items')
          .insert(payload)
        if (error) throw error
      }
    },
    onSuccess: () => {
      toast.success(editingItem ? 'Item diperbarui!' : 'Item ditambahkan!')
      queryClient.invalidateQueries({ queryKey: ['adminItemsList'] })
      setIsOpen(false)
    },
    onError: (err: any) => {
      toast.error(err.message || 'Gagal menyimpan item')
    }
  })

  const bulkAdjustMutation = useMutation({
    mutationFn: async () => {
      const amount = parseInt(bulkAmount)
      if (isNaN(amount) || amount === 0) throw new Error('Nominal tidak valid')

      const { error } = await supabase.rpc('adjust_all_item_prices', {
        p_amount: amount
      })
      if (error) throw error
    },
    onSuccess: () => {
      toast.success('Harga massal berhasil diperbarui!')
      queryClient.invalidateQueries({ queryKey: ['adminItemsList'] })
      setIsBulkOpen(false)
      setBulkAmount('')
    },
    onError: (err: any) => {
      toast.error(err.message || 'Gagal menyesuaikan harga massal')
    }
  })

  const toggleStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string, status: boolean }) => {
      const { error } = await supabase
        .from('items')
        .update({ is_active: status })
        .eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      toast.success('Status item berhasil diubah!')
      queryClient.invalidateQueries({ queryKey: ['adminItemsList'] })
    },
    onError: (err: any) => {
      toast.error(err.message || 'Gagal mengubah status')
    }
  })

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('items').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      toast.success('Item berhasil dihapus!')
      queryClient.invalidateQueries({ queryKey: ['adminItemsList'] })
    },
    onError: (err: any) => {
      toast.error(err.message || 'Item ini sudah memiliki transaksi belanja, tidak dapat dihapus. Silakan nonaktifkan saja.')
    }
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim() || !price || !unit.trim()) {
      toast.error('Nama, harga, dan satuan wajib diisi!')
      return
    }
    saveMutation.mutate()
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-black text-primary-950">Kelola Barang & Sewa</h2>
          <p className="text-text-muted text-sm mt-1">Kelola barang belanjaan dan perlengkapan sewa beserta tarifnya</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setIsBulkOpen(true)}
            className="inline-flex items-center gap-2 px-5 py-3 bg-background border border-border text-primary-950 font-bold hover:bg-primary-50 rounded-xl transition-colors cursor-pointer text-base shadow-sm"
          >
            <Edit className="h-5 w-5" /> Penyesuaian Harga Massal
          </button>
          <button
            onClick={openAdd}
            className="inline-flex items-center gap-2 px-5 py-3 bg-primary-950 text-white font-bold hover:bg-primary-900 rounded-xl transition-colors cursor-pointer text-base shadow-sm"
          >
            <PlusCircle className="h-5 w-5" /> Tambah Item
          </button>
        </div>
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
                  <th className="p-4">Nama Item</th>
                  <th className="p-4">Kategori</th>
                  <th className="p-4">Tipe</th>
                  <th className="p-4">Harga / Tarif</th>
                  <th className="p-4">Satuan</th>
                  <th className="p-4 text-center">Stok</th>
                  <th className="p-4 text-center">Status</th>
                  <th className="p-4 text-center">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border text-base">
                {items.map((itm) => (
                  <tr key={itm.id} className={`hover:bg-primary-50/20 ${!itm.is_active ? 'opacity-65 bg-gray-50/50' : ''}`}>
                    <td className="p-4 text-center font-bold text-text-muted">{itm.sort_order}</td>
                    <td className="p-4">
                      <div className="flex items-center gap-2">
                        <ShoppingBag className="h-5 w-5 text-primary-750 shrink-0" />
                        <span className="font-extrabold text-primary-950">{itm.name}</span>
                      </div>
                    </td>
                    <td className="p-4">
                      <span className="text-xs font-bold px-2.5 py-1 rounded-lg bg-primary-100 text-primary-950 border border-primary-100 uppercase">
                        {itm.category}
                      </span>
                    </td>
                    <td className="p-4 text-sm font-bold uppercase text-primary-900">{itm.item_type === 'purchase' ? 'Beli' : 'Sewa'}</td>
                    <td className="p-4">
                      {itm.discount_price && itm.discount_price > 0 ? (
                        <div className="flex flex-col">
                          <span className="text-xs text-text-muted line-through font-bold">{formatLM(itm.price)}</span>
                          <span className="font-black text-income">{formatLM(itm.discount_price)}</span>
                        </div>
                      ) : (
                        <span className="font-black text-primary-950">{formatLM(itm.price)}</span>
                      )}
                    </td>
                    <td className="p-4 font-semibold text-text-muted">per {itm.unit}</td>
                    <td className="p-4 text-center font-bold text-primary-950">
                      {itm.stock !== null ? itm.stock : <span className="text-xl">∞</span>}
                    </td>
                    <td className="p-4 text-center">
                      <button
                        onClick={() => toggleStatusMutation.mutate({ id: itm.id, status: !itm.is_active })}
                        className="mx-auto block text-text-muted hover:text-primary-950"
                      >
                        {itm.is_active ? (
                          <ToggleRight className="h-8 w-8 text-primary-800" />
                        ) : (
                          <ToggleLeft className="h-8 w-8 text-gray-400" />
                        )}
                      </button>
                    </td>
                    <td className="p-4 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => openEdit(itm)}
                          className="p-2 rounded-xl text-primary-950 hover:bg-primary-50 transition-colors border border-border"
                          title="Edit Item"
                        >
                          <Edit className="h-4.5 w-4.5" />
                        </button>
                        <button
                          onClick={() => {
                            if (window.confirm('Hapus item ini?')) {
                              deleteMutation.mutate(itm.id)
                            }
                          }}
                          className="p-2 rounded-xl text-red-650 hover:bg-red-50 transition-colors border border-border"
                          title="Hapus Item"
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
            {items.map((itm) => (
              <div key={itm.id} className={`p-4 space-y-3 ${!itm.is_active ? 'opacity-65 bg-gray-50/50' : ''}`}>
                <div className="flex justify-between items-start">
                  <div className="flex items-start gap-2">
                    <ShoppingBag className="h-5 w-5 text-primary-750 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-extrabold text-primary-950 block">{itm.name}</span>
                      <div className="flex gap-1.5 mt-1">
                        <span className="text-[9px] font-extrabold px-1.5 py-0.5 rounded bg-primary-100 text-primary-950 uppercase border border-primary-100 leading-none">
                          {itm.category}
                        </span>
                        <span className="text-[9px] font-extrabold px-1.5 py-0.5 rounded bg-gray-50 text-primary-900 border border-gray-200 leading-none uppercase">
                          {itm.item_type === 'purchase' ? 'Beli' : 'Sewa'}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    {itm.discount_price && itm.discount_price > 0 ? (
                      <>
                        <span className="text-xs text-text-muted line-through font-bold block">{formatLM(itm.price)}</span>
                        <span className="text-lg font-black text-income block">{formatLM(itm.discount_price)}</span>
                      </>
                    ) : (
                      <span className="text-lg font-black text-primary-950 block">{formatLM(itm.price)}</span>
                    )}
                    <span className="text-[10px] text-text-muted font-semibold block mt-0.5">per {itm.unit}</span>
                  </div>
                </div>

                <div className="flex items-center justify-between text-sm pt-2 border-t border-border/40">
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-text-muted">Urutan: {itm.sort_order}</span>
                    <span className="text-xs font-bold px-2 py-0.5 bg-primary-50 rounded text-primary-900 border border-primary-200">
                      Stok: {itm.stock !== null ? itm.stock : '∞'}
                    </span>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => toggleStatusMutation.mutate({ id: itm.id, status: !itm.is_active })}
                      className="text-text-muted"
                    >
                      {itm.is_active ? (
                        <span className="text-xs font-bold px-2 py-1 rounded bg-green-50 text-green-700 border border-green-200">Aktif</span>
                      ) : (
                        <span className="text-xs font-bold px-2 py-1 rounded bg-gray-50 text-gray-500 border border-gray-200">Nonaktif</span>
                      )}
                    </button>

                    <button
                      onClick={() => openEdit(itm)}
                      className="p-1.5 text-primary-950 hover:bg-primary-50 rounded-lg border border-border"
                    >
                      <Edit className="h-4 w-4" />
                    </button>

                    <button
                      onClick={() => {
                        if (window.confirm('Hapus item ini?')) {
                          deleteMutation.mutate(itm.id)
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
              {editingItem ? 'Edit Item' : 'Tambah Item Baru'}
            </h3>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-sm font-bold text-primary-950 block">Nama Item</label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Beras Premium"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary-700"
                  disabled={saveMutation.isPending}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-sm font-bold text-primary-950 block">Kategori</label>
                  <select
                    value={category}
                    onChange={e => setCategory(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary-700"
                    disabled={saveMutation.isPending}
                  >
                    {categories.map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-sm font-bold text-primary-950 block">Tipe Item</label>
                  <select
                    value={itemType}
                    onChange={e => setItemType(e.target.value as any)}
                    className="w-full px-4 py-3 rounded-xl border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary-700 font-bold"
                    disabled={saveMutation.isPending}
                  >
                    <option value="purchase">Beli (Purchase)</option>
                    <option value="rental">Sewa (Rental)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-sm font-bold text-primary-950 block">Harga Asli (LM)</label>
                  <input
                    type="number"
                    required
                    min="0"
                    value={price}
                    onChange={e => setPrice(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary-700 font-black text-lg"
                    disabled={saveMutation.isPending}
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-sm font-bold text-primary-950 block">Harga Diskon (Opsional)</label>
                  <input
                    type="number"
                    min="0"
                    value={discountPrice}
                    onChange={e => setDiscountPrice(e.target.value)}
                    placeholder="0"
                    className="w-full px-4 py-3 rounded-xl border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary-700 font-bold text-lg"
                    disabled={saveMutation.isPending}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-sm font-bold text-primary-950 block">Satuan</label>
                  <input
                    type="text"
                    required
                    placeholder="liter, unit, dll"
                    value={unit}
                    onChange={e => setUnit(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary-700"
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
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-sm font-bold text-primary-950 block">Stok Barang</label>
                  <input
                    type="number"
                    min="0"
                    placeholder="Tak Terbatas"
                    value={stock}
                    onChange={e => setStock(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary-700 font-bold"
                    disabled={saveMutation.isPending}
                  />
                  <span className="text-[10px] text-text-muted leading-tight block">Kosongkan jika stok tidak dibatasi</span>
                </div>
              </div>

              {editingItem && (
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
                    Item Aktif (Dapat Dipilih Oleh Banker)
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
                    'Simpan Item'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Bulk Adjust Dialog */}
      {isBulkOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="relative w-full max-w-sm bg-surface rounded-2xl-card shadow-2xl overflow-hidden border border-border p-6">
            <button 
              onClick={() => setIsBulkOpen(false)}
              className="absolute top-4 right-4 p-2 rounded-xl text-text-muted hover:bg-primary-50 transition-colors"
            >
              <X className="h-6 w-6" />
            </button>

            <h3 className="text-2xl font-black text-primary-950 mb-2">Penyesuaian Harga Massal</h3>
            <p className="text-sm text-text-muted mb-4">Ubah harga asli seluruh barang (naik / turun) secara bersamaan.</p>

            <form onSubmit={(e) => { e.preventDefault(); bulkAdjustMutation.mutate(); }} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-sm font-bold text-primary-950 block">Penyesuaian (LM)</label>
                <input
                  type="number"
                  required
                  placeholder="Contoh: 10 atau -5"
                  value={bulkAmount}
                  onChange={e => setBulkAmount(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary-700 text-xl font-black text-center"
                  disabled={bulkAdjustMutation.isPending}
                />
                <span className="text-[11px] text-text-muted block text-center mt-1">Gunakan angka minus (-) untuk menurunkan harga</span>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setIsBulkOpen(false)}
                  className="flex-1 py-3 px-4 bg-background border border-border text-primary-950 font-bold hover:bg-primary-50 rounded-xl transition-colors"
                  disabled={bulkAdjustMutation.isPending}
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="flex-1 py-3 px-4 bg-primary-950 text-white font-bold hover:bg-primary-900 rounded-xl transition-all shadow-md flex items-center justify-center gap-2"
                  disabled={bulkAdjustMutation.isPending}
                >
                  {bulkAdjustMutation.isPending ? <Loader2 className="h-5 w-5 animate-spin" /> : 'Terapkan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
