import React, { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { Coins, CreditCard, Camera, Lock, UserPlus } from 'lucide-react'
import { RFIDScannerDialog } from '../../components/scanner/RFIDScannerDialog'
import { QRCodeScannerDialog } from '../../components/scanner/QRCodeScannerDialog'

export const LandingPage: React.FC = () => {
  const navigate = useNavigate()
  const [rfidOpen, setRfidOpen] = useState(false)
  const [qrOpen, setQrOpen] = useState(false)

  const handleScanSuccess = (classData: { public_token: string }) => {
    navigate(`/wallet/${classData.public_token}`)
  }

  return (
    <div className="flex-1 flex flex-col justify-center items-center py-8 px-4 text-center max-w-2xl mx-auto">
      {/* Brand Icon and Header */}
      <div className="mb-8">
        <div className="mx-auto bg-primary-950 text-white p-6 rounded-3xl shadow-xl w-24 h-24 flex items-center justify-center mb-6 hover:scale-105 transition-transform">
          <Coins className="h-12 w-12" />
        </div>
        <h1 className="text-4xl sm:text-5xl font-black text-primary-950 tracking-tight leading-none">
          LM WALLET
        </h1>
        <p className="text-primary-800 text-lg sm:text-xl font-bold tracking-wide uppercase mt-1">
          Plan. Earn. Spend. Lead.
        </p>
      </div>

      {/* Main Instructions Card */}
      <div className="w-full bg-surface rounded-2xl-card shadow-lg p-6 sm:p-10 border border-border space-y-8">
        <div className="space-y-3">
          <h2 className="text-2xl sm:text-3xl font-extrabold text-primary-950">
            Periksa Saldo Kelas
          </h2>
          <p className="text-text-muted text-base sm:text-lg">
            Tap kartu RFID atau scan QR Code kelas Anda untuk melihat saldo terbaru dan riwayat transaksi.
          </p>
        </div>

        {/* Primary Interactive Buttons */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <button
            onClick={() => setRfidOpen(true)}
            className="flex flex-col items-center justify-center p-6 bg-primary-950 text-white hover:bg-primary-900 rounded-xl transition-all duration-200 cursor-pointer shadow-md group border border-transparent"
          >
            <CreditCard className="h-10 w-10 text-primary-100 mb-3 group-hover:scale-110 transition-transform" />
            <span className="text-lg font-bold">Tap RFID</span>
            <span className="text-xs text-primary-100/80 mt-1 font-medium">Gunakan Card Reader</span>
          </button>

          <button
            onClick={() => setQrOpen(true)}
            className="flex flex-col items-center justify-center p-6 bg-surface text-primary-950 hover:bg-primary-50 rounded-xl transition-all duration-200 cursor-pointer shadow-sm border border-border hover:border-primary-700 group"
          >
            <Camera className="h-10 w-10 text-primary-800 mb-3 group-hover:scale-110 transition-transform" />
            <span className="text-lg font-bold">Scan QR Code</span>
            <span className="text-xs text-text-muted mt-1 font-medium">Gunakan Kamera HP</span>
          </button>
        </div>

        {/* Warning RFID message */}
        <p className="text-xs text-text-muted leading-relaxed max-w-md mx-auto">
          * RFID hanya dapat digunakan pada perangkat yang terhubung dengan RFID Reader USB (mendukung input keyboard).
        </p>
      </div>

      {/* Auxiliary Actions (Login Banker / Admin) */}
      <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
        <Link
          to="/fasilitator"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-primary-900 hover:text-primary-950 hover:bg-primary-100 font-bold transition-all text-base border border-transparent hover:border-primary-100"
        >
          <UserPlus className="h-5 w-5" />
          Menu Fasilitator
        </Link>

        <Link
          to="/login"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-primary-900 hover:text-primary-950 hover:bg-primary-100 font-bold transition-all text-base border border-transparent hover:border-primary-100"
        >
          <Lock className="h-5 w-5" />
          Login Admin / Banker
        </Link>
      </div>

      {/* Scanners Dialog */}
      <RFIDScannerDialog
        isOpen={rfidOpen}
        onClose={() => setRfidOpen(false)}
        onSuccess={handleScanSuccess}
      />

      <QRCodeScannerDialog
        isOpen={qrOpen}
        onClose={() => setQrOpen(false)}
        onSuccess={handleScanSuccess}
      />
    </div>
  )
}
