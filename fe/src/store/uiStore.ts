import { create } from 'zustand';

export type AppView = 'dashboard' | 'user-management';

interface UiState {
    currentView: AppView;
    setCurrentView: (view: AppView) => void;
}

export const useUiStore = create<UiState>((set) => ({
    currentView: 'dashboard',
    setCurrentView: (view) => set({ currentView: view }),
}));
