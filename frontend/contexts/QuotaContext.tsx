import React, { createContext, useContext, useState, useEffect } from 'react';

interface QuotaContextType {
  quota: number;
  maxQuota: number;
  consumeQuota: () => boolean;
  showLimitModal: boolean;
  setShowLimitModal: (show: boolean) => void;
}

const QuotaContext = createContext<QuotaContextType | undefined>(undefined);

const MAX_GUEST_QUOTA = 3;
const STORAGE_KEY = 'pdf_toolbox_guest_quota';
const STORAGE_DATE_KEY = 'pdf_toolbox_quota_date';

export const QuotaProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [quota, setQuota] = useState<number>(MAX_GUEST_QUOTA);
  const [showLimitModal, setShowLimitModal] = useState<boolean>(false);

  useEffect(() => {
    try {
      const today = new Date().toISOString().split('T')[0];
      const savedDate = localStorage.getItem(STORAGE_DATE_KEY);
      const savedQuota = localStorage.getItem(STORAGE_KEY);

      if (savedDate !== today) {
        // Reset quota for new day
        localStorage.setItem(STORAGE_DATE_KEY, today);
        localStorage.setItem(STORAGE_KEY, MAX_GUEST_QUOTA.toString());
        setQuota(MAX_GUEST_QUOTA);
      } else if (savedQuota !== null) {
        setQuota(parseInt(savedQuota, 10));
      }
    } catch (e) {
      console.warn('LocalStorage not accessible for quota tracking', e);
    }
  }, []);

  const consumeQuota = (): boolean => {
    if (quota <= 0) {
      setShowLimitModal(true);
      return false;
    }

    const nextQuota = Math.max(0, quota - 1);
    setQuota(nextQuota);
    try {
      localStorage.setItem(STORAGE_KEY, nextQuota.toString());
    } catch (e) {
      // ignore
    }
    return true;
  };

  return (
    <QuotaContext.Provider value={{
      quota,
      maxQuota: MAX_GUEST_QUOTA,
      consumeQuota,
      showLimitModal,
      setShowLimitModal
    }}>
      {children}
    </QuotaContext.Provider>
  );
};

export const useQuota = () => {
  const context = useContext(QuotaContext);
  if (!context) {
    throw new Error('useQuota must be used within a QuotaProvider');
  }
  return context;
};
