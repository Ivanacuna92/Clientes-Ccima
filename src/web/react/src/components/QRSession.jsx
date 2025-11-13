import React, { useState, useEffect, useRef } from 'react';
import QRCode from 'qrcode';

function QRSession() {
  const [qrData, setQrData] = useState(null);
  const [status, setStatus] = useState({ message: 'Cargando código QR...', type: 'waiting' });
  const [isResetting, setIsResetting] = useState(false);
  const canvasRef = useRef(null);
  const intervalRef = useRef(null);

  useEffect(() => {
    checkQR();
    // Verificar cada 3 segundos
    intervalRef.current = setInterval(checkQR, 3000);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (qrData && canvasRef.current) {
      QRCode.toCanvas(canvasRef.current, qrData, {
        width: 256,
        height: 256,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        }
      });
    }
  }, [qrData]);

  const checkQR = async () => {
    try {
      const response = await fetch('/api/qr');
      const data = await response.json();

      if (data.qr) {
        setQrData(data.qr);
        setStatus({
          message: 'Escanea el código con WhatsApp',
          type: 'waiting'
        });
      } else {
        setQrData(null);
        setStatus({
          message: data.message || 'Bot conectado exitosamente',
          type: 'success'
        });
      }
    } catch (error) {
      setStatus({
        message: 'Error de conexión: ' + error.message,
        type: 'error'
      });
    }
  };

  const resetSession = async () => {
    if (isResetting) return;

    if (!window.confirm('¿Estás seguro de que quieres reiniciar la sesión de WhatsApp?')) {
      return;
    }

    setIsResetting(true);
    try {
      const response = await fetch('/api/logout', { method: 'POST' });
      const data = await response.json();

      if (data.success) {
        setStatus({
          message: 'Reiniciando sesión... Espera el nuevo QR',
          type: 'waiting'
        });
        // Esperar 3 segundos antes de verificar el nuevo QR
        setTimeout(checkQR, 3000);
      } else {
        setStatus({
          message: 'Error: ' + data.message,
          type: 'error'
        });
      }
    } catch (error) {
      setStatus({
        message: 'Error: ' + error.message,
        type: 'error'
      });
    } finally {
      setIsResetting(false);
    }
  };

  const getStatusClass = () => {
    switch (status.type) {
      case 'success':
        return 'bg-green-100 text-green-700 border-2 border-green-500';
      case 'waiting':
        return 'bg-blue-100 text-blue-700 border-2 border-blue-400';
      case 'error':
        return 'bg-red-100 text-red-700 border-2 border-red-400';
      default:
        return 'bg-gray-100 text-gray-700 border-2 border-gray-400';
    }
  };

  return (
    <div className="p-8 max-w-full overflow-auto flex items-center justify-center min-h-[calc(100vh-80px)]">
      <div className="bg-white rounded-lg shadow-sm p-8 border-t-4 border-t-navetec-accent-red max-w-md w-full">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold mb-2 text-navetec-primary">
            CCIMA WhatsApp
          </h1>
          <p className="text-sm text-gray-600">
            Escanea el código QR para conectar
          </p>
        </div>

        <div className="bg-gray-50 rounded-lg border-2 border-gray-200 hover:border-navetec-primary-light transition-all p-6 mb-6 min-h-[300px] flex items-center justify-center">
          {qrData ? (
            <canvas ref={canvasRef} className="rounded-md" />
          ) : (
            <div className="text-center">
              {status.type === 'success' ? (
                <div className="text-green-600">
                  <svg className="w-16 h-16 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <p className="font-medium">✓ Conectado exitosamente</p>
                </div>
              ) : (
                <div className="animate-pulse">
                  <div className="w-64 h-64 bg-gray-300 rounded-md"></div>
                </div>
              )}
            </div>
          )}
        </div>

        <div className={`p-3 rounded-md text-sm font-medium mb-4 ${getStatusClass()}`}>
          {status.message}
        </div>

        <button
          onClick={resetSession}
          disabled={isResetting}
          className="w-full px-4 py-3 bg-navetec-accent-red hover:bg-navetec-accent-red-dark text-white rounded-md text-sm font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {isResetting ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
              Reiniciando...
            </>
          ) : (
            'Reiniciar Sesión'
          )}
        </button>

        <div className="mt-6 pt-6 border-t border-gray-200 text-xs text-gray-600 leading-relaxed">
          <strong>Instrucciones:</strong><br />
          1. Abre WhatsApp en tu teléfono<br />
          2. Ve a Configuración → Dispositivos vinculados<br />
          3. Toca "Vincular dispositivo"<br />
          4. Escanea este código QR
        </div>
      </div>
    </div>
  );
}

export default QRSession;
