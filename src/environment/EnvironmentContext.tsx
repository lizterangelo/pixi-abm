import { createContext, useContext, useState, ReactNode } from 'react';
import { River, createRiver } from './River';

interface EnvironmentContextType {
  river: River;
  setRiver: (river: River) => void;
}

const EnvironmentContext = createContext<EnvironmentContextType | undefined>(undefined);

export const EnvironmentProvider = ({ children }: { children: ReactNode }) => {
  const [river, setRiver] = useState<River>(createRiver());

  return (
    <EnvironmentContext.Provider value={{ river, setRiver }}>
      {children}
    </EnvironmentContext.Provider>
  );
};

export const useEnvironment = () => {
  const context = useContext(EnvironmentContext);
  if (context === undefined) {
    throw new Error('useEnvironment must be used within an EnvironmentProvider');
  }
  return context;
}; 