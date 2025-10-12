import React, { createContext, useState, ReactNode } from 'react';

interface PlayerDataContextType {
  playerData: any;
  setPlayerData: (data: any) => void;
  loadingStatus: string[];
  setLoadingStatus: (status: string[] | ((prev: string[]) => string[])) => void;
  profileIconUrl: string;
  setProfileIconUrl: (url: string) => void;
  errorMessage: string;
  setErrorMessage: (msg: string) => void;
}

export const PlayerDataContext = createContext<PlayerDataContextType | null>(null);

export function PlayerDataProvider({ children }: { children: ReactNode }) {
  const [playerData, setPlayerData] = useState<any>(null);
  const [loadingStatus, setLoadingStatus] = useState<string[]>([]);
  const [profileIconUrl, setProfileIconUrl] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string>('');

  return (
    <PlayerDataContext.Provider value={{ playerData, setPlayerData, loadingStatus, setLoadingStatus, profileIconUrl, setProfileIconUrl, errorMessage, setErrorMessage }}>
      {children}
    </PlayerDataContext.Provider>
  );
}
