import React, { createContext, useContext, useState, useEffect } from 'react';
import { apiFetch } from '../lib/api';

interface BrandingData {
  primaryLogo?: string;
  mobileLogo?: string;
  favicon?: string;
  heroBackground?: string;
  cornerImage?: string;
}

interface BrandingContextType {
  branding: BrandingData | null;
  refreshBranding: () => void;
  isLoading: boolean;
}

const BrandingContext = createContext<BrandingContextType>({
  branding: null,
  refreshBranding: () => {},
  isLoading: true
});

export const useBranding = () => useContext(BrandingContext);

export const BrandingProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [branding, setBranding] = useState<BrandingData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchBranding = async () => {
    try {
      setIsLoading(true);
      const res = await apiFetch('/api/branding');
      if (res.ok) {
        const data = await res.json();
        setBranding(data);
        
        // Update favicon dynamically
        const faviconHref = data.favicon || '/assets/aistudio/e2e2df32-f624-464c-bbf2-dd5e68b4722a_268f824d.jpg';
        let link = document.querySelector("link[rel~='icon']") as HTMLLinkElement;
        if (!link) {
          link = document.createElement('link');
          link.rel = 'icon';
          document.head.appendChild(link);
        }
        link.href = faviconHref;
      }
    } catch (error) {
      console.error('Failed to fetch branding data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchBranding();
  }, []);

  return (
    <BrandingContext.Provider value={{ branding, refreshBranding: fetchBranding, isLoading }}>
      {children}
    </BrandingContext.Provider>
  );
};
