import { useState, useEffect, useCallback } from 'react';

interface SerialPort {
  readable: ReadableStream<Uint8Array> | null;
  writable: WritableStream<Uint8Array> | null;
  open(options: { baudRate: number }): Promise<void>;
  close(): Promise<void>;
}

interface Serial extends EventTarget {
  requestPort(): Promise<SerialPort>;
  getPorts(): Promise<SerialPort[]>;
}

declare global {
  interface Navigator {
    serial: Serial;
  }
}

export type RfidStatus = 'disconnected' | 'connecting' | 'connected' | 'scanning' | 'card-detected' | 'error';

// --- GLOBAL STATE ---
// We keep these outside the hook so they survive HMR and route changes.
// This ensures we don't lose the reference to an open port/reader.
let globalPort: SerialPort | null = null;
let globalReader: ReadableStreamDefaultReader<Uint8Array> | null = null;
let globalIsReading = false;

// Global state variables for UI
let globalStatus: RfidStatus = 'disconnected';
let globalLastUid: string | null = null;
let globalError: string | null = null;
let globalLastScanTime = 0;

// Simple subscription system
type Listener = () => void;
const listeners = new Set<Listener>();

function notify() {
  listeners.forEach(l => l());
}

function setGlobalStatus(s: RfidStatus) {
  globalStatus = s;
  notify();
}

function setGlobalError(e: string | null) {
  globalError = e;
  notify();
}

function setGlobalLastUid(uid: string | null) {
  globalLastUid = uid;
  notify();
}

// Register Vite HMR cleanup if available
if (import.meta.hot) {
  import.meta.hot.dispose(() => {
    globalIsReading = false;
    if (globalReader) {
      globalReader.cancel().catch(() => {});
    }
  });
}

// Ensure port closes on page reload/close
window.addEventListener('beforeunload', () => {
  globalIsReading = false;
  if (globalReader) {
    globalReader.cancel().catch(() => {});
  }
});

export function useRfidSerial() {
  // Trigger re-render when global state changes
  const [, setTick] = useState(0);

  useEffect(() => {
    const listener = () => setTick(t => t + 1);
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  }, []);

  const clearScan = useCallback(() => {
    setGlobalLastUid(null);
  }, []);

  const checkSupport = () => {
    return 'serial' in navigator;
  };

  // Attempt to recover dangling ports granted to this origin and auto connect
  useEffect(() => {
    if (!checkSupport()) return;
    if (globalPort) return; // Already connected in another instance
    
    const autoConnect = async () => {
      try {
        const ports = await navigator.serial.getPorts();
        if (ports.length > 0) {
          console.log('[Web Serial] Auto-connecting to previously granted port...');
          const port = ports[0];
          
          // Try to close if dangling, ignore error
          try { await port.close(); } catch(e) {}
          
          await port.open({ baudRate: 115200 });
          globalPort = port;
          globalIsReading = true;
          setGlobalStatus('connected');
          readLoop();
        }
      } catch (e) {
        console.error('[Web Serial] Error auto-connecting:', e);
      }
    };
    
    autoConnect();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /**
   * Disconnect securely closes reader and port.
   */
  const disconnect = useCallback(async () => {
    if (!globalPort && !globalReader) {
      setGlobalStatus('disconnected');
      return;
    }

    globalIsReading = false;
    setGlobalStatus('disconnected'); // Optimistic UI update

    try {
      if (globalReader) {
        await globalReader.cancel();
        globalReader.releaseLock();
        globalReader = null;
      }
      
      if (globalPort) {
        await globalPort.close();
        globalPort = null;
      }
      
      setGlobalError(null);
    } catch (err: unknown) {
      console.error('[Web Serial] Error disconnecting:', err);
      // Even if closing throws an error (e.g., port physically removed),
      // we clear references so we can try to connect again cleanly.
      globalReader = null;
      globalPort = null;
    }
  }, []);

  /**
   * Aggressive reset connection function.
   * Useful when the port gets stuck in an intermediate state.
   */
  const resetConnection = useCallback(async () => {
    console.log('[Web Serial] Force resetting connection...');
    globalIsReading = false;
    setGlobalStatus('disconnected');
    setGlobalError(null);
    
    try {
      if (globalReader) {
        try { await globalReader.cancel(); } catch (err) { console.error('Cancel error:', err); }
        try { globalReader.releaseLock(); } catch (err) { console.error('Release lock error:', err); }
        globalReader = null;
      }
    } catch (_e) {}

    try {
      if (globalPort) {
        try { await globalPort.close(); } catch (err) { console.error('Port close error:', err); }
        globalPort = null;
      }
    } catch (_e) {}
    
    setGlobalError('Koneksi RFID telah di-reset');
    console.log('[Web Serial] Reset complete.');
  }, []);

  const connect = useCallback(async () => {
    if (!checkSupport()) {
      setGlobalError('Browser Anda tidak mendukung Web Serial API. Gunakan Chrome, Edge, atau Opera.');
      return;
    }

    // Prevent double connect
    if (globalStatus === 'connecting' || globalStatus === 'connected' || globalStatus === 'scanning') {
      return;
    }

    try {
      setGlobalStatus('connecting');
      setGlobalError(null);

      // If we somehow have a dangling port, force clean it first
      if (globalPort) {
         await resetConnection();
      }

      // Request port from user
      const port = await navigator.serial.requestPort();
      globalPort = port;

      // Open port with baud rate 115200
      await port.open({ baudRate: 115200 });
      
      setGlobalStatus('connected');
      globalIsReading = true;
      
      // Start reading loop
      readLoop();
    } catch (err: unknown) {
      console.error('[Web Serial] Error connecting:', err);
      let errorMsg = 'Gagal menghubungkan ke perangkat.';
      
      if (err instanceof Error) {
        if (err.name === 'NotFoundError') {
          errorMsg = 'Pemilihan perangkat dibatalkan.';
        } else if (err.name === 'NetworkError') {
          errorMsg = 'Port sibuk (Access Denied). Jika tidak ada aplikasi lain, CABUT lalu COLOK kembali kabel USB Arduino Anda.';
        } else if (err.name === 'InvalidStateError') {
          errorMsg = 'Port sudah terbuka oleh tab ini. Gunakan Reset Koneksi.';
        } else {
          errorMsg = `[${err.name}] ${err.message}`;
        }
      }
      
      setGlobalError(errorMsg);
      setGlobalStatus('error');
      // Force clean if it failed midway
      globalPort = null;
      globalReader = null;
      globalIsReading = false;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [globalStatus, resetConnection]);

  const readLoop = useCallback(async () => {
    if (!globalPort) return;
    setGlobalStatus('scanning');

    const decoder = new TextDecoder();
    let buffer = '';

    while (globalPort && globalPort.readable && globalIsReading) {
      try {
        globalReader = globalPort.readable.getReader();
        
        while (globalReader) {
          const { value, done } = await globalReader.read();
          
          if (done) {
            // Reader has been canceled
            break;
          }
          
          if (value) {
            buffer += decoder.decode(value, { stream: true });
            
            // Process complete lines
            const lines = buffer.split('\n');
            // Keep the last incomplete line in the buffer
            buffer = lines.pop() || '';

            for (const line of lines) {
              const cleanLine = line.trim();
              if (cleanLine.startsWith('RFID:')) {
                const uid = cleanLine.substring(5).trim().toUpperCase();
                handleUidDetected(uid);
              }
            }
          }
        }
      } catch (err) {
        console.error('[Web Serial] Serial read error:', err);
        setGlobalError('Perangkat RFID tidak ditemukan atau port sedang digunakan aplikasi lain. Reset Koneksi.');
        setGlobalStatus('error');
        // We do NOT disconnect fully here automatically to avoid infinite crash loops, 
        // we just exit loop. User must click "Putuskan" or "Reset".
        break;
      } finally {
        if (globalReader) {
          try {
            globalReader.releaseLock();
          } catch (e) {
            console.error('[Web Serial] Error releasing lock:', e);
          }
          globalReader = null;
        }
      }
    }
    
    // If loop exited and we are no longer reading
    if (!globalIsReading && globalStatus !== 'disconnected' && globalStatus !== 'error') {
       setGlobalStatus('disconnected');
    }
  }, []);

  const handleUidDetected = (uid: string) => {
    const now = Date.now();
    // 2 seconds debounce
    if (now - globalLastScanTime < 2000) {
      return;
    }
    
    globalLastScanTime = now;
    setGlobalLastUid(uid);
    setGlobalStatus('card-detected');
    
    // Auto revert back to scanning status
    setTimeout(() => {
      if (globalIsReading) {
        setGlobalStatus('scanning');
      }
    }, 1000);
  };

  // Kami HAPUS disconnect saat unmount agar koneksi tetap hidup saat user pindah rute (Banker -> Dashboard -> Banker)
  // Koneksi port global akan tetap terjaga.

  // Listen for physical disconnect events
  useEffect(() => {
    const handleDisconnect = (e: Event) => {
      // e.target represents the port that was disconnected
      if (globalPort && (e.target as unknown as SerialPort) === globalPort) {
        setGlobalError('Kabel USB perangkat dicabut secara fisik.');
        setGlobalStatus('error');
        disconnect();
      }
    };

    if ('serial' in navigator) {
      navigator.serial.addEventListener('disconnect', handleDisconnect);
    }
    
    return () => {
      if ('serial' in navigator) {
        navigator.serial.removeEventListener('disconnect', handleDisconnect);
      }
    };
  }, [disconnect]);

  return {
    isSupported: checkSupport(),
    status: globalStatus,
    lastUid: globalLastUid,
    error: globalError,
    connect,
    disconnect,
    resetConnection,
    clearScan
  };
}
