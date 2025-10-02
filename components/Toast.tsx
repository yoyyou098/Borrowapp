
import React, { useEffect, useState } from 'react';
import type { ToastData } from '../types';

interface ToastProps {
  toast: ToastData | null;
  onClose: () => void;
}

const Toast: React.FC<ToastProps> = ({ toast, onClose }) => {
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (toast) {
      setShow(true);
      const timer = setTimeout(() => {
        handleClose();
      }, toast.undoCallback ? 5000 : 2800);
      return () => clearTimeout(timer);
    } else {
      setShow(false);
    }
  }, [toast]);

  const handleClose = () => {
    setShow(false);
    setTimeout(onClose, 300); // Wait for transition to finish
  };

  if (!toast) return null;

  const typeMap = {
    info: { icon: 'ℹ️', color: 'text-blue-600' },
    success: { icon: '✅', color: 'text-emerald-600' },
    error: { icon: '⚠️', color: 'text-red-600' },
  };
  
  const iconInfo = toast.undoCallback ? { icon: '🗑️', color: 'text-red-600' } : typeMap[toast.type];

  return (
    <div className={`toast bg-white/95 backdrop-blur rounded-lg shadow-lg border border-gray-200 p-4 min-w-[280px] ${show ? 'show' : ''}`}>
      <div className="flex items-start">
        <div className={`text-xl mr-3 ${iconInfo.color}`}>{iconInfo.icon}</div>
        <div>
          <p className="text-sm font-semibold text-gray-800">{toast.title}</p>
          <p 
            onClick={() => {
              if (toast.undoCallback) {
                toast.undoCallback();
                handleClose();
              }
            }}
            className={`text-sm mt-1 ${toast.undoCallback ? 'text-blue-600 cursor-pointer hover:underline' : 'text-gray-600'}`}
          >
            {toast.message}
          </p>
        </div>
      </div>
    </div>
  );
};

export default Toast;
