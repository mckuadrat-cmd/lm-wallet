import React, { useState, useEffect } from 'react';
import { useRfidSerial, type RfidStatus } from '../../hooks/useRfidSerial';
import { AlertCircle, CheckCircle2, Usb, CreditCard, XCircle, Info, History, RefreshCcw } from 'lucide-react';
import { toast } from 'sonner';

interface ScanHistory {
  uid: string;
  timestamp: Date;
}

export const RfidTest: React.FC = () => {
  const { isSupported, status, lastUid, error, connect, disconnect, resetConnection } = useRfidSerial();
  const [history, setHistory] = useState<ScanHistory[]>([]);

  // Update history when a new card is detected
  useEffect(() => {
    if (status === 'card-detected' && lastUid) {
      toast.success(`Kartu terdeteksi: ${lastUid}`);
      
      setHistory(prev => {
        // Prevent immediate duplicates in history (within 1 second)
        const isDuplicate = prev.length > 0 && 
                            prev[0].uid === lastUid && 
                            (new Date().getTime() - prev[0].timestamp.getTime() < 1000);
        
        if (isDuplicate) return prev;
        
        const newHistory = [{ uid: lastUid, timestamp: new Date() }, ...prev];
        return newHistory.slice(0, 10); // Keep only last 10
      });
    }
  }, [status, lastUid]);

  // Handle errors
  useEffect(() => {
    if (error) {
      toast.error(error);
    }
  }, [error]);

  const handleReset = async () => {
    await resetConnection();
    toast.success('Koneksi telah di-reset secara paksa.');
  };

  const getStatusBadge = (currentStatus: RfidStatus) => {
    switch (currentStatus) {
      case 'disconnected':
        return <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium bg-gray-100 text-gray-700"><XCircle className="h-4 w-4" /> Terputus</span>;
      case 'connecting':
        return <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium bg-yellow-100 text-yellow-800"><span className="h-2 w-2 rounded-full bg-yellow-600 animate-pulse"></span> Menghubungkan...</span>;
      case 'connected':
        return <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800"><CheckCircle2 className="h-4 w-4" /> Terhubung</span>;
      case 'scanning':
        return <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800"><span className="h-2 w-2 rounded-full bg-blue-600 animate-pulse"></span> Menunggu Kartu...</span>;
      case 'card-detected':
        return <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium bg-primary-100 text-primary-800"><CreditCard className="h-4 w-4" /> Kartu Terdeteksi</span>;
      case 'error':
        return <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium bg-red-100 text-red-800"><AlertCircle className="h-4 w-4" /> Error</span>;
    }
  };

  const isConnectDisabled = status === 'connecting' || status === 'connected' || status === 'scanning' || status === 'card-detected';

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Pengujian RFID (Web Serial)</h2>
        <p className="mt-1 text-gray-500">
          Halaman ini digunakan khusus untuk menguji konektivitas antara web browser dan perangkat Arduino RFID melalui kabel USB.
        </p>
      </div>

      {!isSupported && (
        <div className="bg-red-50 border-l-4 border-red-400 p-4 rounded-md">
          <div className="flex">
            <div className="flex-shrink-0">
              <AlertCircle className="h-5 w-5 text-red-400" />
            </div>
            <div className="ml-3">
              <p className="text-sm text-red-700">
                Browser Anda tidak mendukung Web Serial API. Fitur ini membutuhkan Google Chrome, Microsoft Edge, atau Opera.
              </p>
            </div>
          </div>
        </div>
      )}

      {isSupported && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Kontrol & Status */}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Usb className="h-5 w-5 text-gray-500" />
              Kontrol Perangkat
            </h3>

            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700">Status Koneksi</span>
                {getStatusBadge(status)}
              </div>

              {/* Peringatan sebelum connect */}
              {status === 'disconnected' && (
                <div className="bg-blue-50 p-3 rounded-lg flex items-start gap-3">
                  <Info className="h-5 w-5 text-blue-500 shrink-0 mt-0.5" />
                  <p className="text-sm text-blue-700">
                    Pastikan kabel USB Arduino sudah terpasang. 
                    <strong> Penting:</strong> Jika Anda sedang membuka <em>Serial Monitor</em> di Arduino IDE, tutup terlebih dahulu agar port bisa digunakan.
                  </p>
                </div>
              )}

              <div className="flex gap-2">
                <button
                  onClick={connect}
                  disabled={isConnectDisabled}
                  className="flex-[2] flex justify-center items-center gap-2 px-4 py-2 bg-primary-900 text-white rounded-lg hover:bg-primary-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                >
                  <Usb className="h-4 w-4" />
                  {status === 'connecting' ? 'Memproses...' : 'Hubungkan RFID'}
                </button>
                <button
                  onClick={disconnect}
                  disabled={status === 'disconnected'}
                  className="flex-1 flex justify-center items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                >
                  <XCircle className="h-4 w-4" />
                  Putuskan
                </button>
              </div>

              <div className="pt-4 border-t border-gray-100">
                <p className="text-xs text-gray-500 mb-2">Jika koneksi tersangkut atau port masih dianggap sibuk (Access Denied):</p>
                <button
                  onClick={handleReset}
                  className="w-full flex justify-center items-center gap-2 px-4 py-2 bg-red-50 text-red-700 border border-red-200 rounded-lg hover:bg-red-100 transition-colors font-medium text-sm"
                >
                  <RefreshCcw className="h-4 w-4" />
                  Reset Paksa Koneksi
                </button>
              </div>

              {error && (
                <div className="p-3 bg-red-50 text-red-700 text-sm rounded-lg border border-red-100">
                  <span className="font-semibold block mb-1">Terjadi Kesalahan:</span>
                  {error}
                </div>
              )}
            </div>
          </div>

          {/* Pembacaan Terakhir & Riwayat */}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <History className="h-5 w-5 text-gray-500" />
              Riwayat Pembacaan
            </h3>

            <div className="mb-6">
              <span className="text-sm font-medium text-gray-500 block mb-1">UID Kartu Terakhir:</span>
              <div className={`p-4 rounded-lg border-2 flex items-center justify-center transition-all duration-300 ${status === 'card-detected' ? 'bg-primary-50 border-primary-800 scale-[1.02]' : 'bg-gray-50 border-gray-200'}`}>
                {lastUid ? (
                  <span className="text-2xl font-bold tracking-widest text-gray-900 font-mono">
                    {lastUid}
                  </span>
                ) : (
                  <span className="text-gray-400 italic">Belum ada kartu</span>
                )}
              </div>
            </div>

            <div>
              <span className="text-sm font-medium text-gray-500 block mb-3">10 Kartu Terakhir:</span>
              
              {history.length === 0 ? (
                <p className="text-sm text-gray-400 italic text-center py-4 bg-gray-50 rounded-lg">Riwayat kosong</p>
              ) : (
                <ul className="space-y-2">
                  {history.map((h, i) => (
                    <li key={i} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg text-sm">
                      <span className="font-mono font-bold text-gray-800">{h.uid}</span>
                      <span className="text-gray-500">
                        {h.timestamp.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
