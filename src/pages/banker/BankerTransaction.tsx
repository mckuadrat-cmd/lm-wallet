import React, { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useQuery, useMutation } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase/supabaseClient'
import { formatLM } from '../../lib/formatters/formatters'
import { RFIDScannerDialog } from '../../components/scanner/RFIDScannerDialog'
import { QRCodeScannerDialog } from '../../components/scanner/QRCodeScannerDialog'
import { 
  ShoppingBag, 
  Clock, 
  Award, 
  Sparkles, 
  AlertTriangle, 
  Coins, 
  ArrowRight, 
  ArrowLeft,
  Plus, 
  Minus, 
  Loader2, 
  Camera, 
  X,
  XCircle,
  CheckCircle2
} from 'lucide-react'
import { toast } from 'sonner'

// Interfaces
interface CatalogItem {
  id: string
  name: string
  category: string
  item_type: 'purchase' | 'rental'
  price: number
  unit: string
  discount_price?: number
  stock: number | null
}

interface MissionItem {
  id: string
  name: string
  description: string | null
  reward_amount: number
}

interface ClassSelectInfo {
  class_id: string
  class_name: string
  class_code: string
  class_color: string | null
  class_icon: string | null
  current_balance: number
  public_token: string
}

interface CartItem {
  item_id: string
  item_name: string
  item_type: string
  quantity: number
  unit: string
  unit_price: number
  subtotal: number
}

export const BankerTransaction: React.FC = () => {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()

  // Steps: 1 (Type select), 2 (Form/Cart details), 3 (Class select / confirm), 4 (Success receipt)
  const [step, setStep] = useState(1)
  
  // Transaction Header parameters
  const [txType, setTxType] = useState<string>('') 
  const [direction, setDirection] = useState<'income' | 'expense'>('income')
  const [amount, setAmount] = useState<number>(0)
  const [description, setDescription] = useState<string>('')
  const [missionId, setMissionId] = useState<string>('')
  const [missionDeduction, setMissionDeduction] = useState<number>(0)

  // Cart for items
  const [cart, setCart] = useState<Record<string, CartItem>>({})
  const [discount, setDiscount] = useState<number>(0)
  
  // Target class parameters
  const [targetClass, setTargetClass] = useState<ClassSelectInfo | null>(null)

  // Dialog controllers
  const [rfidOpen, setRfidOpen] = useState(false)
  const [qrOpen, setQrOpen] = useState(false)
  const [classModalOpen, setClassModalOpen] = useState(false)
  const [confirmModalOpen, setConfirmModalOpen] = useState(false)
  
  // Success receipt metadata
  const [receiptInfo, setReceiptInfo] = useState<{
    txNumber: string
    className: string
    direction: 'income' | 'expense'
    amount: number
    newBalance: number
  } | null>(null)

  // Queries
  // 1. Fetch Items
  const { data: items = [], isLoading: itemsLoading } = useQuery<CatalogItem[]>({
    queryKey: ['bankerItemsCatalog'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('items')
        .select('*')
        .eq('is_active', true)
        .order('sort_order', { ascending: true })
      if (error) throw error
      return data.map(i => ({ 
        ...i, 
        price: Number(i.price),
        discount_price: i.discount_price ? Number(i.discount_price) : undefined,
        stock: i.stock !== null ? Number(i.stock) : null
      }))
    }
  })

  // 2. Fetch Missions
  const { data: missions = [], isLoading: missionsLoading } = useQuery<MissionItem[]>({
    queryKey: ['bankerMissionsList'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('missions')
        .select('*')
        .eq('is_active', true)
        .order('sort_order', { ascending: true })
      if (error) throw error
      return data.map(m => ({ ...m, reward_amount: Number(m.reward_amount) }))
    }
  })

  // 3. Fetch Classes for Manual list
  const { data: classes = [] } = useQuery<ClassSelectInfo[]>({
    queryKey: ['bankerClassesForSelect'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('classes')
        .select('id, name, code, color, icon, current_balance, public_token')
        .eq('is_active', true)
        .order('sort_order', { ascending: true })
      if (error) throw error
      return data.map(c => ({
        class_id: c.id,
        class_name: c.name,
        class_code: c.code,
        class_color: c.color,
        class_icon: c.icon,
        current_balance: Number(c.current_balance),
        public_token: c.public_token
      }))
    }
  })

  // Check URL params for quick type pre-selection
  useEffect(() => {
    const typeParam = searchParams.get('type')
    if (typeParam) {
      handleSelectType(typeParam)
    }
  }, [searchParams])

  // Mutation to save transaction (calls create_lm_transaction RPC)
  const submitTransactionMutation = useMutation({
    mutationFn: async () => {
      if (!targetClass) throw new Error('Kelas belum dipilih')

      // Form items JSON if applicable
      const itemsPayload = ['purchase', 'rental'].includes(txType) 
        ? Object.values(cart)
        : null

      const { data, error } = await supabase.rpc('create_lm_transaction', {
        p_class_id: targetClass.class_id,
        p_direction: direction,
        p_transaction_type: txType === 'mission' ? 'mission_reward' : txType,
        p_amount: amount,
        p_mission_id: missionId || null,
        p_description: description ? (discount > 0 ? `${description} (Diskon: ${formatLM(discount)})` : description) : (discount > 0 ? `(Diskon: ${formatLM(discount)})` : null),
        p_items: itemsPayload
      })

      if (error) throw error
      return data
    },
    onSuccess: (data: any) => {
      setReceiptInfo({
        txNumber: data.transaction_number,
        className: targetClass?.class_name || '',
        direction: direction,
        amount: amount,
        newBalance: Number(data.new_balance)
      })
      setConfirmModalOpen(false)
      setStep(4)
      
      // Reset workspace state except receipt
      setCart({})
      setTargetClass(null)
    },
    onError: (err: any) => {
      toast.error(err.message || 'Gagal memproses transaksi')
    }
  })

  // Predefine direct transaction type mappings
  const handleSelectType = (type: string) => {
    setTxType(type)
    setAmount(0)
    setDiscount(0)
    setDescription('')
    setMissionId('')
    setCart({})
    setTargetClass(null)
    
    // Auto-map directions
    if (type === 'purchase' || type === 'rental' || type === 'penalty' || type === 'adjustment_subtract' || type === 'other_expense') {
      setDirection('expense')
    } else {
      setDirection('income')
    }
    
    setStep(2)
  }

  // Cart operations
  const handleUpdateCartQty = (item: CatalogItem, delta: number) => {
    const current = cart[item.id]
    const currentQty = current ? current.quantity : 0
    const newQty = currentQty + delta

    // Check stock limit
    if (item.stock !== null && newQty > item.stock) {
      toast.error(`Stok tidak mencukupi! Sisa stok ${item.name}: ${item.stock}`)
      return
    }

    if (newQty <= 0) {
      const copy = { ...cart }
      delete copy[item.id]
      setCart(copy)
    } else {
      const activePrice = item.discount_price && item.discount_price > 0 ? item.discount_price : item.price
      setCart({
        ...cart,
        [item.id]: {
          item_id: item.id,
          item_name: item.name,
          item_type: item.item_type,
          quantity: newQty,
          unit: item.unit,
          unit_price: activePrice,
          subtotal: newQty * activePrice
        }
      })
    }
  }

  // Calculate cart sums
  useEffect(() => {
    if (['purchase', 'rental'].includes(txType)) {
      const sum = Object.values(cart).reduce((total, i) => total + i.subtotal, 0)
      setAmount(Math.max(0, sum - discount))
      
      // Generate default item snapshot descriptions
      const desc = Object.values(cart).map(i => `${i.item_name} (${i.quantity} ${i.unit})`).join(', ')
      setDescription(desc)
    }
  }, [cart, txType, discount])

  // Handle Mission Selection
  const handleSelectMission = (id: string) => {
    setMissionId(id)
    setMissionDeduction(0) // Reset deduction when selecting a new mission
    const mission = missions.find(m => m.id === id)
    if (mission) {
      setAmount(mission.reward_amount)
      setDescription(`Hadiah Misi: ${mission.name}`)
    } else {
      setAmount(0)
      setDescription('')
    }
  }

  // Effect to recalculate amount when deduction changes
  useEffect(() => {
    if (txType === 'mission' && missionId) {
      const mission = missions.find(m => m.id === missionId)
      if (mission) {
        setAmount(Math.max(0, mission.reward_amount - missionDeduction))
      }
    }
  }, [missionDeduction, missionId, txType, missions])

  // Confirm details step validation
  const handleProceedToClassSelect = () => {
    if (amount <= 0) {
      toast.error('Jumlah transaksi harus lebih dari 0 LM!')
      return
    }
    if (txType === 'mission' && !missionId) {
      toast.error('Harap pilih misi!')
      return
    }
    if (!description.trim() && !['purchase', 'rental'].includes(txType)) {
      toast.error('Keterangan / alasan transaksi harus diisi!')
      return
    }
    setRfidOpen(true)
  }

  // Class card selected handler
  const handleClassIdentified = (classData: ClassSelectInfo) => {
    setTargetClass(classData)
    setClassModalOpen(false)
    setConfirmModalOpen(true)
  }

  // Calculate estimated balance
  const estimatedBalance = targetClass 
    ? (direction === 'income' 
        ? targetClass.current_balance + amount 
        : targetClass.current_balance - amount)
    : 0

  const isBalanceInsufficient = direction === 'expense' && estimatedBalance < 0

  const resetWizard = () => {
    setStep(1)
    setTxType('')
    setAmount(0)
    setDiscount(0)
    setDescription('')
    setMissionId('')
    setCart({})
    setTargetClass(null)
    setReceiptInfo(null)
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Step Indicators */}
      {step < 4 && (
        <div className="flex items-center justify-between bg-surface border border-border p-4 rounded-xl shadow-xs">
          <div className="flex items-center gap-1.5 text-xs sm:text-sm font-bold text-primary-950">
            <span className={`h-6 w-6 rounded-full flex items-center justify-center text-xs ${step >= 1 ? 'bg-primary-950 text-white' : 'bg-gray-100 text-text-muted'}`}>1</span>
            Tipe
          </div>
          <div className="h-0.5 bg-border flex-1 mx-3" />
          <div className="flex items-center gap-1.5 text-xs sm:text-sm font-bold text-primary-950">
            <span className={`h-6 w-6 rounded-full flex items-center justify-center text-xs ${step >= 2 ? 'bg-primary-950 text-white' : 'bg-gray-100 text-text-muted'}`}>2</span>
            Isi Detail
          </div>
          <div className="h-0.5 bg-border flex-1 mx-3" />
          <div className="flex items-center gap-1.5 text-xs sm:text-sm font-bold text-primary-950">
            <span className={`h-6 w-6 rounded-full flex items-center justify-center text-xs ${step >= 3 ? 'bg-primary-950 text-white' : 'bg-gray-100 text-text-muted'}`}>3</span>
            Konfirmasi
          </div>
        </div>
      )}

      {/* Step 1: Select Transaction Type */}
      {step === 1 && (
        <div className="bg-surface rounded-2xl-card border border-border p-6 shadow-sm space-y-6">
          <h2 className="text-2xl font-black text-primary-950">Pilih Jenis Transaksi</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <button
              onClick={() => handleSelectType('purchase')}
              className="flex items-center gap-4 p-5 rounded-xl border border-border hover:border-primary-700 bg-background text-left transition-colors group cursor-pointer"
            >
              <div className="bg-primary-100 text-primary-950 p-3 rounded-lg group-hover:scale-105 transition-transform shrink-0">
                <ShoppingBag className="h-6 w-6" />
              </div>
              <div>
                <span className="text-base font-extrabold text-primary-950 block">Pembelian Barang</span>
                <span className="text-xs text-text-muted">Beras, mi instan, nugget, minyak, telur, dll.</span>
              </div>
            </button>

            <button
              onClick={() => handleSelectType('rental')}
              className="flex items-center gap-4 p-5 rounded-xl border border-border hover:border-primary-700 bg-background text-left transition-colors group cursor-pointer"
            >
              <div className="bg-primary-100 text-primary-950 p-3 rounded-lg group-hover:scale-105 transition-transform shrink-0">
                <Clock className="h-6 w-6" />
              </div>
              <div>
                <span className="text-base font-extrabold text-primary-950 block">Pembayaran Sewa</span>
                <span className="text-xs text-text-muted">Kompor portabel, magic com, sewa kamar, karpet.</span>
              </div>
            </button>

            <button
              onClick={() => handleSelectType('mission')}
              className="flex items-center gap-4 p-5 rounded-xl border border-border hover:border-primary-700 bg-background text-left transition-colors group cursor-pointer"
            >
              <div className="bg-primary-100 text-primary-950 p-3 rounded-lg group-hover:scale-105 transition-transform shrink-0">
                <Award className="h-6 w-6" />
              </div>
              <div>
                <span className="text-base font-extrabold text-primary-950 block">Hadiah Misi</span>
                <span className="text-xs text-text-muted">Reward atas selesainya tugas/tantangan wajib.</span>
              </div>
            </button>

            <button
              onClick={() => handleSelectType('bonus')}
              className="flex items-center gap-4 p-5 rounded-xl border border-border hover:border-primary-700 bg-background text-left transition-colors group cursor-pointer"
            >
              <div className="bg-primary-100 text-primary-950 p-3 rounded-lg group-hover:scale-105 transition-transform shrink-0">
                <Sparkles className="h-6 w-6" />
              </div>
              <div>
                <span className="text-base font-extrabold text-primary-950 block">Bonus Kelas</span>
                <span className="text-xs text-text-muted">Tambahan LM atas inisiatif & kedisiplinan.</span>
              </div>
            </button>

            <button
              onClick={() => handleSelectType('penalty')}
              className="flex items-center gap-4 p-5 rounded-xl border border-border hover:border-primary-700 bg-background text-left transition-colors group cursor-pointer"
            >
              <div className="bg-primary-100 text-primary-950 p-3 rounded-lg group-hover:scale-105 transition-transform shrink-0">
                <AlertTriangle className="h-6 w-6" />
              </div>
              <div>
                <span className="text-base font-extrabold text-primary-950 block">Denda / Penalty</span>
                <span className="text-xs text-text-muted">Pengurangan LM akibat pelanggaran aturan.</span>
              </div>
            </button>

            <button
              onClick={() => handleSelectType('other_income')}
              className="flex items-center gap-4 p-5 rounded-xl border border-border hover:border-primary-700 bg-background text-left transition-colors group cursor-pointer"
            >
              <div className="bg-primary-100 text-primary-950 p-3 rounded-lg group-hover:scale-105 transition-transform shrink-0">
                <Coins className="h-6 w-6" />
              </div>
              <div>
                <span className="text-base font-extrabold text-primary-950 block">Transaksi Lain-Lain</span>
                <span className="text-xs text-text-muted">Pemasukan / Pengeluaran non-standar lainnya.</span>
              </div>
            </button>
          </div>
        </div>
      )}

      {/* Step 2: Input Details */}
      {step === 2 && (
        <div className="bg-surface rounded-2xl-card border border-border p-6 shadow-sm space-y-6">
          <div className="flex items-center justify-between border-b border-border/60 pb-3">
            <h2 className="text-2xl font-black text-primary-950">Detail Transaksi</h2>
            <button
              onClick={() => setStep(1)}
              className="text-sm font-bold text-text-muted hover:text-primary-950 inline-flex items-center gap-1"
            >
              <ArrowLeft className="h-4 w-4" /> Ganti Tipe
            </button>
          </div>

          {/* Catalog Cart View for Purchase and Rental */}
          {['purchase', 'rental'].includes(txType) && (
            <div className="space-y-6">
              {itemsLoading ? (
                <div className="flex items-center justify-center py-6">
                  <Loader2 className="h-8 w-8 animate-spin text-primary-950" />
                </div>
              ) : (
                <div className="space-y-4">
                  <h3 className="text-lg font-bold text-primary-950 uppercase tracking-wider">Katalog Barang</h3>
                  <div className="divide-y divide-border border border-border rounded-xl bg-background overflow-hidden max-h-[300px] overflow-y-auto">
                    {items
                      .filter(i => i.item_type === txType)
                      .map(item => {
                        const inCart = cart[item.id]
                        return (
                          <div key={item.id} className="flex justify-between items-center p-3">
                            <div>
                              <span className="font-extrabold text-primary-950 block text-base">{item.name}</span>
                              {item.discount_price && item.discount_price > 0 ? (
                                <div className="text-xs leading-none mt-0.5 block">
                                  <span className="text-text-muted line-through mr-1">{formatLM(item.price)}</span>
                                  <span className="text-income font-bold">{formatLM(item.discount_price)} per {item.unit}</span>
                                </div>
                              ) : (
                                <span className="text-xs text-text-muted leading-none mt-0.5 block">{formatLM(item.price)} per {item.unit}</span>
                              )}
                              <span className="text-[10px] font-bold text-primary-900 mt-1 block">
                                Stok: {item.stock !== null ? item.stock : '∞'}
                              </span>
                            </div>

                            <div className="flex items-center gap-3">
                              {inCart ? (
                                <div className="flex items-center gap-2">
                                  <button
                                    onClick={() => handleUpdateCartQty(item, -1)}
                                    className="p-1 rounded-lg bg-surface border border-border text-primary-950"
                                  >
                                    <Minus className="h-4 w-4" />
                                  </button>
                                  <span className="font-bold text-lg px-2 text-primary-950">{inCart.quantity}</span>
                                  <button
                                    onClick={() => handleUpdateCartQty(item, 1)}
                                    className="p-1 rounded-lg bg-surface border border-border text-primary-950"
                                  >
                                    <Plus className="h-4 w-4" />
                                  </button>
                                </div>
                              ) : (
                                <button
                                  onClick={() => handleUpdateCartQty(item, 1)}
                                  disabled={item.stock === 0}
                                  className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors ${
                                    item.stock === 0 
                                      ? 'bg-gray-200 text-gray-500 cursor-not-allowed' 
                                      : 'bg-primary-950 text-white hover:bg-primary-900'
                                  }`}
                                >
                                  {item.stock === 0 ? 'Habis' : 'Tambah'}
                                </button>
                              )}
                            </div>
                          </div>
                        )
                      })}
                  </div>

                  {/* Cart Summary Panel */}
                  <div className="bg-primary-50 p-4 rounded-xl border border-primary-100 space-y-2">
                    <span className="text-xs text-primary-800 font-bold block uppercase tracking-wider">Ringkasan Belanja</span>
                    {Object.values(cart).length === 0 ? (
                      <p className="text-sm text-text-muted font-medium italic">Keranjang kosong. Pilih barang di atas.</p>
                    ) : (
                      <div className="space-y-1.5 text-sm text-primary-950 font-semibold max-h-[120px] overflow-y-auto pr-1">
                        {Object.values(cart).map((c, idx) => (
                          <div key={idx} className="flex justify-between">
                            <span>{c.item_name} (x{c.quantity})</span>
                            <span>{formatLM(c.subtotal)}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Mission Selection view */}
          {txType === 'mission' && (
            <div className="space-y-4">
              {missionsLoading ? (
                <div className="flex items-center justify-center py-6">
                  <Loader2 className="h-8 w-8 animate-spin text-primary-950" />
                </div>
              ) : (
                <>
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-primary-950 block">Pilih Misi</label>
                    <select
                      value={missionId}
                      onChange={e => handleSelectMission(e.target.value)}
                      className="w-full px-4 py-3 rounded-xl border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary-700 font-bold text-base"
                    >
                      <option value="">-- Pilih Misi Dari Daftar --</option>
                      {missions.map(m => (
                        <option key={m.id} value={m.id}>
                          {m.name} ({formatLM(m.reward_amount)})
                        </option>
                      ))}
                    </select>
                  </div>
                  
                  {missionId && (
                    <div className="space-y-1.5 mt-4 p-4 bg-red-50 border border-red-100 rounded-xl">
                      <label className="text-sm font-bold text-red-900 block">Pengurangan LM (Jika Tidak Selesai Penuh)</label>
                      <input
                        type="number"
                        min="0"
                        value={missionDeduction || ''}
                        onChange={e => setMissionDeduction(parseInt(e.target.value) || 0)}
                        placeholder="Contoh: 50 (Kosongkan jika full)"
                        className="w-full px-4 py-3 rounded-xl border border-red-200 bg-white focus:outline-none focus:ring-2 focus:ring-red-500 text-lg font-bold text-red-900"
                      />
                      <div className="flex justify-between items-center bg-primary-50 p-4 rounded-xl border border-primary-100">
                        <span className="font-bold text-primary-900">Total Akhir</span>
                        <span className="text-lg font-black text-primary-950">{formatLM(amount)}</span>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {/* Custom entry fields for Bonus, Penalty, other */}
          {!['purchase', 'rental', 'mission'].includes(txType) && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-sm font-bold text-primary-950 block">Nominal (LM)</label>
                <input
                  type="number"
                  required
                  min="1"
                  value={amount || ''}
                  onChange={e => setAmount(parseInt(e.target.value) || 0)}
                  placeholder="Contoh: 200"
                  className="w-full px-4 py-3 rounded-xl border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary-700 text-lg font-bold"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-bold text-primary-950 block">Arah Mutasi</label>
                <select
                  value={direction}
                  onChange={e => setDirection(e.target.value as any)}
                  className="w-full px-4 py-3 rounded-xl border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary-700 font-bold"
                >
                  <option value="income">Tambah (+)</option>
                  <option value="expense">Kurangi (-)</option>
                </select>
              </div>
            </div>
          )}

          {/* Shared description block (Only editable for non-cart transactions) */}
          {!['purchase', 'rental'].includes(txType) && (
            <div className="space-y-1.5">
              <label className="text-sm font-bold text-primary-950 block">Keterangan / Catatan Transaksi</label>
              <textarea
                required
                rows={3}
                value={description}
                onChange={e => setDescription(e.target.value)}
                placeholder="Keterangan denda / bonus / job reward..."
                className="w-full px-4 py-3 rounded-xl border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary-700 text-base"
                disabled={txType === 'mission' && !!missionId}
              />
            </div>
          )}

          {/* Diskon Input for Purchase/Rental */}
          {['purchase', 'rental'].includes(txType) && (
            <div className="space-y-1.5 pt-2 border-t border-border/40">
              <label className="text-sm font-bold text-primary-950 block">Diskon Transaksi (LM)</label>
              <input
                type="number"
                min="0"
                value={discount || ''}
                onChange={(e) => setDiscount(Math.max(0, parseInt(e.target.value) || 0))}
                placeholder="0"
                className="w-full px-4 py-3 rounded-xl border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary-700 text-lg font-bold"
              />
              <span className="text-xs text-text-muted">Opsional. Mengurangi total nominal transaksi secara keseluruhan.</span>
            </div>
          )}

          {/* Big Total Box */}
          <div className="bg-primary-950 text-white p-5 rounded-2xl flex justify-between items-center shadow-md">
            <div>
              <span className="text-xs text-primary-100 font-bold uppercase tracking-wider block">Total Transaksi</span>
              <span className="text-xs text-primary-100 mt-1 block">Arah: {direction === 'income' ? 'Pemasukan (+)' : 'Pengeluaran (-)'}</span>
            </div>
            <div className="text-right">
              {discount > 0 && (
                <div className="text-xs text-primary-200 line-through mb-1">
                  {formatLM(amount + discount)}
                </div>
              )}
              <div className="text-3xl font-black">{formatLM(amount)}</div>
            </div>
          </div>

          {/* Step Actions */}
          <div className="flex gap-3 pt-4">
            <button
              onClick={() => setStep(1)}
              className="flex-1 py-3.5 px-4 bg-background border border-border text-primary-950 font-bold hover:bg-primary-50 rounded-xl transition-colors text-base"
            >
              Batal
            </button>
            <button
              onClick={handleProceedToClassSelect}
              className="flex-1 py-3.5 px-4 bg-primary-950 text-white font-bold hover:bg-primary-900 rounded-xl transition-all shadow-md flex items-center justify-center gap-2 text-base cursor-pointer"
            >
              Lanjutkan <ArrowRight className="h-5 w-5" />
            </button>
          </div>
        </div>
      )}

      {/* Step 4: Success Receipt */}
      {step === 4 && receiptInfo && (
        <div className="bg-surface rounded-2xl-card border border-border p-8 shadow-md text-center space-y-6">
          <div className="mx-auto bg-green-50 text-income p-4 rounded-full w-16 h-16 flex items-center justify-center">
            <CheckCircle2 className="h-10 w-10" />
          </div>

          <div className="space-y-2">
            <h2 className="text-3xl font-black text-primary-950">Transaksi Berhasil</h2>
            <span className="text-xs text-text-muted font-mono font-bold block">{receiptInfo.txNumber}</span>
          </div>

          {/* Receipt Info Panel */}
          <div className="bg-background rounded-xl p-5 border border-border max-w-sm mx-auto space-y-3 font-semibold text-primary-950">
            <div className="flex justify-between">
              <span className="text-text-muted">Kelas:</span>
              <span className="text-lg font-black">{receiptInfo.className}</span>
            </div>
            <div className="flex justify-between border-t border-border/40 pt-2.5">
              <span className="text-text-muted">Nominal:</span>
              <span className={`text-lg font-black ${receiptInfo.direction === 'income' ? 'text-income' : 'text-expense'}`}>
                {receiptInfo.direction === 'income' ? '+' : '-'}{formatLM(receiptInfo.amount)}
              </span>
            </div>
            <div className="flex justify-between border-t border-border/40 pt-2.5">
              <span className="text-text-muted">Saldo Baru:</span>
              <span className="text-lg font-black text-primary-950">{formatLM(receiptInfo.newBalance)}</span>
            </div>
          </div>

          <div className="flex flex-col gap-2 max-w-xs mx-auto pt-4">
            <button
              onClick={resetWizard}
              className="py-3 px-4 bg-primary-950 text-white font-bold hover:bg-primary-900 rounded-xl transition-all shadow-md text-base"
            >
              Transaksi Baru
            </button>
            <button
              onClick={() => navigate('/banker/history')}
              className="py-3 px-4 bg-background border border-border text-primary-950 font-bold hover:bg-primary-50 rounded-xl transition-colors text-base"
            >
              Lihat Riwayat
            </button>
          </div>
        </div>
      )}

      {/* Class Selection Dialog */}
      {classModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="relative w-full max-w-lg bg-surface rounded-2xl-card shadow-2xl overflow-hidden border border-border p-6">
            <button 
              onClick={() => setClassModalOpen(false)}
              className="absolute top-4 right-4 p-2 rounded-xl text-text-muted hover:bg-primary-50 transition-colors"
            >
              <X className="h-6 w-6" />
            </button>

            <h3 className="text-2xl font-black text-primary-950 mb-1 text-center">Pilih Kelas Manual</h3>
            <p className="text-sm text-text-muted text-center mb-6">Pilih akun kelas secara manual untuk memproses transaksi.</p>

            {/* Manual Active Classes Card Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-4">
              {classes.map(cls => (
                <button
                  key={cls.class_id}
                  onClick={() => handleClassIdentified(cls)}
                  className="p-4 bg-background hover:bg-primary-50 border border-border hover:border-primary-700 rounded-xl text-center transition-colors group"
                >
                  <span className="text-lg font-black text-primary-950 group-hover:text-primary-900 block">{cls.class_name}</span>
                  <span className="text-[10px] text-text-muted font-bold block mt-1">Saldo: {formatLM(cls.current_balance)}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Double-Entry Transaction Confirmation Modal */}
      {confirmModalOpen && targetClass && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="relative w-full max-w-md bg-surface rounded-2xl-card shadow-2xl overflow-hidden border border-border p-6">
            <button 
              onClick={() => { setConfirmModalOpen(false); setTargetClass(null); }}
              className="absolute top-4 right-4 p-2 rounded-xl text-text-muted hover:bg-primary-50 transition-colors"
            >
              <X className="h-6 w-6" />
            </button>

            <h3 className="text-2xl font-black text-primary-950 mb-1">Konfirmasi Transaksi</h3>
            <p className="text-sm text-text-muted mb-4">Harap periksa kecocokan data sebelum memproses saldo.</p>

            <div className="bg-background rounded-xl p-4 border border-border space-y-3 font-semibold text-primary-950">
              <div className="flex justify-between">
                <span className="text-text-muted">Kelas Penerima:</span>
                <span className="text-lg font-black">{targetClass.class_name}</span>
              </div>
              <div className="flex justify-between border-t border-border/40 pt-2 mt-2">
                <span className="text-text-muted">Total Nominal:</span>
                <span className={`text-lg font-black ${direction === 'income' ? 'text-income' : 'text-expense'}`}>
                  {direction === 'income' ? '+' : '-'}{formatLM(amount)}
                </span>
              </div>
              <div className="flex justify-between border-t border-border/40 pt-2 mt-2">
                <span className="text-text-muted">Saldo Sebelum:</span>
                <span>{formatLM(targetClass.current_balance)}</span>
              </div>
              <div className="flex justify-between border-t border-border/40 pt-2 mt-2 font-bold">
                <span className="text-text-muted">Estimasi Saldo Setelah:</span>
                <span className={estimatedBalance >= 0 ? 'text-primary-950 font-black' : 'text-red-600 font-black'}>
                  {formatLM(estimatedBalance)}
                </span>
              </div>
            </div>

            {/* Error state if insufficient balance */}
            {isBalanceInsufficient && (
              <div className="mt-4 flex items-start gap-2 bg-red-50 text-red-700 p-4 rounded-xl border border-red-200 text-xs">
                <XCircle className="h-5 w-5 shrink-0 text-red-600" />
                <div className="space-y-1">
                  <p className="font-bold leading-tight">Saldo Tidak Mencukupi!</p>
                  <p className="leading-tight">
                    Transaksi ini diblokir karena pengeluaran ({formatLM(amount)}) lebih besar daripada saldo kelas yang tersedia ({formatLM(targetClass.current_balance)}).
                  </p>
                </div>
              </div>
            )}

            <div className="flex gap-3 pt-6">
              <button
                type="button"
                onClick={() => { setConfirmModalOpen(false); setTargetClass(null); }}
                className="flex-1 py-3 px-4 bg-background border border-border text-primary-950 font-bold hover:bg-primary-50 rounded-xl transition-colors"
                disabled={submitTransactionMutation.isPending}
              >
                Batal
              </button>
              <button
                onClick={() => submitTransactionMutation.mutate()}
                className="flex-1 py-3 px-4 bg-primary-950 text-white font-bold hover:bg-primary-900 rounded-xl transition-all shadow-md flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                disabled={submitTransactionMutation.isPending || isBalanceInsufficient}
              >
                {submitTransactionMutation.isPending ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin" />
                    Memproses...
                  </>
                ) : (
                  'Proses Transaksi'
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Scanners Dialog */}
      <RFIDScannerDialog
        isOpen={rfidOpen}
        onClose={() => setRfidOpen(false)}
        onSuccess={handleClassIdentified}
        footerActions={
          <div className="flex flex-col gap-2 w-full">
            <button
              onClick={() => { setRfidOpen(false); setQrOpen(true); }}
              className="flex items-center gap-3 py-3 px-4 bg-background text-primary-950 border border-border rounded-xl hover:bg-primary-50 transition-colors font-bold text-sm justify-center w-full"
            >
              <Camera className="h-4 w-4" /> Beralih ke Scan QR
            </button>
            <button
              onClick={() => { setRfidOpen(false); setClassModalOpen(true); }}
              className="flex items-center gap-3 py-3 px-4 bg-background text-primary-950 border border-border rounded-xl hover:bg-primary-50 transition-colors font-bold text-sm justify-center w-full"
            >
              Pilih Kelas Manual
            </button>
          </div>
        }
      />

      <QRCodeScannerDialog
        isOpen={qrOpen}
        onClose={() => setQrOpen(false)}
        onSuccess={handleClassIdentified}
      />
    </div>
  )
}
