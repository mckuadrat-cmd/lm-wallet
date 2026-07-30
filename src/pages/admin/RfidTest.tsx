import React, { useState, useEffect } from 'react';
import { useRfidSerial, type RfidStatus } from '../../hooks/useRfidSerial';
import { useWebNfc, type NfcStatus } from '../../hooks/useWebNfc';
import { AlertCircle, CheckCircle2, Usb, CreditCard, XCircle, Info, History, RefreshCcw, Smartphone } from 'lucide-react';
import { toast } from 'sonner';

interface ScanHistory {
  uid: string;
  timestamp: Date;
  method: string;
}

export const RfidTest: React.FC = () => {
  const { 
    isSupported: isSerialSupported, 
    status: serialStatus, 
    lastUid: serialLastUid, 
    error: serialError, 
    connect: connectSerial, 
    disconnect: disconnectSerial, 
    resetConnection: resetSerialConnection,
    clearScan: clearSerialScan
  } = useRfidSerial();

  const {
    isSupported: isNfcSupported,
    status: nfcStatus,
    lastUid: nfcLastUid,
    error: nfcError,
    startScanning: startNfcScan,
    stopScanning: stopNfcScan,
    clearScan: clearNfcScan
  } = useWebNfc();

  const [history, setHistory] = useState<ScanHistory[]>([]);

  const addHistory = (uid: string, method: string) => {
    setHistory(prev => {
      // Mencegah duplikasi instan dalam riwayat (dalam 1.5 detik)
      const isDuplicate = prev.length > 0 && 
                          prev[0].uid === uid && 
                          (new Date().getTime() - prev[0].timestamp.getTime() < 1500);
      
      if (isDuplicate) return prev;
      
      const newHistory = [{ uid, timestamp: new Date(), method }, ...prev];
      return newHistory.slice(0, 10); // Simpan maks 10 riwayat terakhir
    });
  };

  // Update riwayat ketika kartu terdeteksi via Web Serial (USB)
  useEffect(() => {
    if (serialStatus === 'card-detected' && serialLastUid) {
      toast.success(`[USB] Kartu terdeteksi: ${serialLastUid}`);
      addHistory(serialLastUid, 'USB Serial');
    }
  }, [serialStatus, serialLastUid]);

  // Update riwayat ketika kartu terdeteksi via Web NFC (HP)
  useEffect(() => {
    if (nfcStatus === 'card-detected' && nfcLastUid) {
      toast.success(`[NFC HP] Kartu terdeteksi: ${nfcLastUid}`);
      addHistory(nfcLastUid, 'NFC HP');
    }
  }, [nfcStatus, nfcLastUid]);

  // Handle errors
  useEffect(() => {
    if (serialError) {
      toast.error(`[USB Error] ${serialError}`);
    }
  }, [serialError]);

  useEffect(() => {
    if (nfcError) {
      toast.error(`[NFC Error] ${nfcError}`);
    }
  }, [nfcError]);

  const handleSerialReset = async () => {
    await resetSerialConnection();
    toast.success('Koneksi Serial telah di-reset secara paksa.');
  };

  const getSerialStatusBadge = (currentStatus: RfidStatus) => {
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

  const getNfcStatusBadge = (currentStatus: NfcStatus) => {
    switch (currentStatus) {
      case 'unsupported':
        return <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium bg-red-100 text-red-800"><XCircle className="h-4 w-4" /> Tidak Didukung</span>;
      case 'idle':
        return <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium bg-gray-100 text-gray-700"><XCircle className="h-4 w-4" /> Nonaktif</span>;
      case 'scanning':
        return <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800"><span className="h-2 w-2 rounded-full bg-blue-600 animate-pulse"></span> Menunggu Kartu...</span>;
      case 'card-detected':
        return <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium bg-primary-100 text-primary-800"><CreditCard className="h-4 w-4" /> Kartu Terdeteksi</span>;
      case 'error':
        return <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium bg-red-100 text-red-800"><AlertCircle className="h-4 w-4" /> Error</span>;
    }
  };

  const isSerialConnectDisabled = serialStatus === 'connecting' || serialStatus === 'connected' || serialStatus === 'scanning' || serialStatus === 'card-detected';

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Pengujian RFID & NFC</h2>
        <p className="mt-1 text-gray-500">
          Halaman ini digunakan untuk menguji fungsionalitas pemindaian fisik kartu menggunakan Web Serial (USB Desktop) atau Web NFC (HP Android).
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* ================= BLOK 1: WEB NFC HP (ANDROID) ================= */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 flex flex-col justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Smartphone className="h-5 w-5 text-gray-500" />
              Kontrol NFC HP (Android)
            </h3>

            {!isNfcSupported ? (
              <div className="bg-amber-50 p-4 rounded-lg flex items-start gap-3 mb-4">
                <AlertCircle className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
                <p className="text-sm text-amber-800">
                  Web NFC tidak didukung di perangkat/browser ini. 
                  Fitur ini membutuhkan <strong>Google Chrome di HP Android</strong> dengan fitur NFC yang diaktifkan di Pengaturan sistem.
                </p>
              </div>
            ) : (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-700">Status NFC</span>
                  {getNfcStatusBadge(nfcStatus)}
                </div>

                {nfcStatus === 'idle' && (
                  <div className="bg-blue-50 p-3 rounded-lg flex items-start gap-3">
                    <Info className="h-5 w-5 text-blue-500 shrink-0 mt-0.5" />
                    <p className="text-sm text-blue-700">
                      Tekan tombol aktifkan di bawah, kemudian tempelkan kartu RFID/NFC Anda ke sensor di belakang bodi HP Android Anda.
                    </p>
                  </div>
                )}

                <div className="flex gap-2">
                  <button
                    onClick={startNfcScan}
                    disabled={nfcStatus === 'scanning' || nfcStatus === 'card-detected'}
                    className="flex-[2] flex justify-center items-center gap-2 px-4 py-2 bg-primary-950 text-white rounded-lg hover:bg-primary-900 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium cursor-pointer"
                  >
                    <Smartphone className="h-4 w-4" />
                    Aktifkan NFC HP
                  </button>
                  <button
                    onClick={stopNfcScan}
                    disabled={nfcStatus === 'idle' || nfcStatus === 'unsupported'}
                    className="flex-1 flex justify-center items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium cursor-pointer"
                  >
                    <XCircle className="h-4 w-4" />
                    Matikan
                  </button>
                </div>
              </div>
            )}
          </div>

          {isNfcSupported && nfcError && (
            <div className="mt-4 p-3 bg-red-50 text-red-700 text-sm rounded-lg border border-red-100">
              <span className="font-semibold block mb-1">Terjadi Kesalahan:</span>
              {nfcError}
            </div>
          )}
        </div>

        {/* ================= BLOK 2: WEB SERIAL USB (DESKTOP) ================= */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Usb className="h-5 w-5 text-gray-500" />
            Kontrol USB Serial (Desktop)
          </h3>

          {!isSerialSupported ? (
            <div className="bg-amber-50 p-4 rounded-lg flex items-start gap-3 mb-4">
              <AlertCircle className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
              <p className="text-sm text-amber-800">
                Web Serial API tidak didukung di browser ini. Gunakan Google Chrome, Microsoft Edge, atau Opera pada Komputer/Desktop.
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700">Status Koneksi USB</span>
                {getSerialStatusBadge(serialStatus)}
              </div>

              {serialStatus === 'disconnected' && (
                <div className="bg-blue-50 p-3 rounded-lg flex items-start gap-3">
                  <Info className="h-5 w-5 text-blue-500 shrink-0 mt-0.5" />
                  <p className="text-sm text-blue-700">
                    Pastikan kabel USB Arduino sudah terpasang. Tutup <em>Serial Monitor</em> di Arduino IDE sebelum menghubungkan.
                  </p>
                </div>
              )}

              <div className="flex gap-2">
                <button
                  onClick={connectSerial}
                  disabled={isSerialConnectDisabled}
                  className="flex-[2] flex justify-center items-center gap-2 px-4 py-2 bg-primary-950 text-white rounded-lg hover:bg-primary-900 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium cursor-pointer"
                >
                  <Usb className="h-4 w-4" />
                  {serialStatus === 'connecting' ? 'Memproses...' : 'Hubungkan RFID'}
                </button>
                <button
                  onClick={disconnectSerial}
                  disabled={serialStatus === 'disconnected'}
                  className="flex-1 flex justify-center items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium cursor-pointer"
                >
                  <XCircle className="h-4 w-4" />
                  Putuskan
                </button>
              </div>

              <div className="pt-4 border-t border-gray-100">
                <p className="text-xs text-gray-500 mb-2">Jika koneksi tersangkut atau port masih dianggap sibuk (Access Denied):</p>
                <button
                  onClick={handleSerialReset}
                  className="w-full flex justify-center items-center gap-2 px-4 py-2 bg-red-50 text-red-700 border border-red-200 rounded-lg hover:bg-red-100 transition-colors font-medium text-sm cursor-pointer"
                >
                  <RefreshCcw className="h-4 w-4" />
                  Reset Paksa Koneksi
                </button>
              </div>
            </div>
          )}

          {isSerialSupported && serialError && (
            <div className="mt-4 p-3 bg-red-50 text-red-700 text-sm rounded-lg border border-red-100">
              <span className="font-semibold block mb-1">Terjadi Kesalahan:</span>
              {serialError}
            </div>
          )}
        </div>
      </div>

      {/* ================= BLOK 3: RIWAYAT PEMBACAAN KARTU (SHARED) ================= */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <History className="h-5 w-5 text-gray-500" />
          Riwayat Pembacaan Kartu
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Card Terakhir USB */}
          <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider block mb-1">UID USB Terakhir</span>
            <div className="text-xl font-bold tracking-widest text-gray-900 font-mono">
              {serialLastUid || <span className="text-gray-400 font-sans italic text-sm font-normal">Belum ada kartu</span>}
            </div>
          </div>

          {/* Card Terakhir NFC HP */}
          <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider block mb-1">UID NFC HP Terakhir</span>
            <div className="text-xl font-bold tracking-widest text-gray-900 font-mono">
              {nfcLastUid || <span className="text-gray-400 font-sans italic text-sm font-normal">Belum ada kartu</span>}
            </div>
          </div>

          {/* Tombol Clear Riwayat */}
          <div className="flex items-center justify-end">
            <button
              onClick={() => {
                setHistory([]);
                clearSerialScan();
                clearNfcScan();
                toast.success('Riwayat berhasil dibersihkan');
              }}
              className="px-4 py-2 text-sm font-medium text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer"
            >
              Bersihkan Riwayat
            </button>
          </div>
        </div>

        <div className="mt-6">
          <span className="text-sm font-medium text-gray-500 block mb-3">10 Kartu Terakhir (Gabungan):</span>
          
          {history.length === 0 ? (
            <p className="text-sm text-gray-400 italic text-center py-4 bg-gray-50 rounded-lg">Riwayat kosong</p>
          ) : (
            <ul className="space-y-2">
              {history.map((h, i) => (
                <li key={i} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg text-sm border border-gray-100">
                  <div className="flex items-center gap-3">
                    <span className="font-mono font-bold text-gray-800">{h.uid}</span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${h.method === 'NFC HP' ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'}`}>
                      {h.method}
                    </span>
                  </div>
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
  );
};
