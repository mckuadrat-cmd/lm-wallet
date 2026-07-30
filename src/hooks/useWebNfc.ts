import { useState, useEffect, useCallback, useRef } from 'react';

export type NfcStatus = 'unsupported' | 'idle' | 'scanning' | 'card-detected' | 'error';

interface NDEFReadingEvent extends Event {
  serialNumber: string;
}

interface NDEFReader {
  scan(options?: { signal: AbortSignal }): Promise<void>;
  addEventListener(
    type: 'reading' | 'readingerror',
    listener: (this: NDEFReader, ev: NDEFReadingEvent) => any
  ): void;
}

declare global {
  interface Window {
    NDEFReader?: {
      new (): NDEFReader;
    };
  }
}

export function useWebNfc() {
  const [status, setStatus] = useState<NfcStatus>('idle');
  const [lastUid, setLastUid] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const checkSupport = useCallback(() => {
    return typeof window !== 'undefined' && 'NDEFReader' in window;
  }, []);

  useEffect(() => {
    if (!checkSupport()) {
      setStatus('unsupported');
    }
  }, [checkSupport]);

  const stopScanning = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    if (checkSupport()) {
      setStatus('idle');
    }
  }, [checkSupport]);

  const startScanning = useCallback(async () => {
    if (!checkSupport()) {
      setError('Web NFC tidak didukung di perangkat/browser ini.');
      setStatus('unsupported');
      return;
    }

    // Hentikan scan yang sedang berjalan (jika ada)
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }

    try {
      setStatus('scanning');
      setError(null);

      const controller = new AbortController();
      abortControllerRef.current = controller;

      // @ts-ignore
      const ndef = new window.NDEFReader();
      await ndef.scan({ signal: controller.signal });

      ndef.addEventListener('reading', (event: any) => {
        const serialNumber = event.serialNumber;
        if (serialNumber) {
          // Bersihkan format serialNumber (misal: "04:2a:b3:1a" -> "042AB31A")
          const formattedUid = serialNumber.replace(/:/g, '').toUpperCase();
          setLastUid(formattedUid);
          setStatus('card-detected');

          // Kembalikan status ke scanning setelah 1.5 detik agar siap membaca kartu berikutnya
          setTimeout(() => {
            setStatus((prev) => {
              if (prev === 'card-detected') {
                return 'scanning';
              }
              return prev;
            });
          }, 1500);
        }
      });

      ndef.addEventListener('readingerror', () => {
        setError('Gagal membaca kartu NFC. Pastikan posisi kartu pas.');
        setStatus('error');
      });

    } catch (err: any) {
      console.error('[Web NFC] Error starting scan:', err);
      let errorMsg = 'Gagal mengaktifkan NFC.';

      if (err.name === 'NotAllowedError') {
        errorMsg = 'Izin NFC ditolak oleh pengguna/sistem.';
      } else if (err.name === 'NotSupportedError' || err.name === 'NotReadableError') {
        errorMsg = 'NFC tidak aktif atau tidak didukung. Aktifkan NFC di Pengaturan HP Anda.';
      } else if (err.name === 'AbortError') {
        // Diabaikan karena dibatalkan secara normal
        return;
      } else {
        errorMsg = err.message || errorMsg;
      }

      setError(errorMsg);
      setStatus('error');
    }
  }, [checkSupport, stopScanning]);

  const clearScan = useCallback(() => {
    setLastUid(null);
  }, []);

  // Pastikan koneksi dibatalkan jika komponen unmount
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  return {
    isSupported: checkSupport(),
    status,
    lastUid,
    error,
    startScanning,
    stopScanning,
    clearScan
  };
}
