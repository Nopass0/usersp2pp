import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface IdexCabinetWithSelection extends IdexCabinet {
  selected: boolean;
}

interface IdexCabinet {
  id: number;
  idexId: number;
  login: string;
  password: string;
}

interface WorkSessionState {
  activeCabinets: IdexCabinetWithSelection[];
  comment: string;
  
  // Методы для работы с кабинетами
  setActiveCabinets: (cabinets: IdexCabinetWithSelection[]) => void;
  setCabinetSelected: (id: number, selected: boolean) => void;
  setComment: (comment: string) => void;
  resetState: () => void;
  resetCabinetSelections: () => void;
  selectAllCabinets: (selected: boolean) => void;
  
  // Вспомогательные методы
  getSelectedCabinets: () => IdexCabinetWithSelection[];
  getSelectedIds: () => number[];
}

export const useWorkSessionStore = create<WorkSessionState>()(
  persist(
    (set, get) => ({
      activeCabinets: [],
      comment: '',
      
      setActiveCabinets: (cabinets) => {
        set({ activeCabinets: cabinets });
      },
      
      setCabinetSelected: (id, selected) => {
        set((state) => ({
          activeCabinets: state.activeCabinets.map((cabinet) =>
            cabinet.id === id ? { ...cabinet, selected } : cabinet
          ),
        }));
      },
      
      setComment: (comment) => set({ comment }),
      
      resetState: () => set({ 
        activeCabinets: [], 
        comment: '' 
      }),
      
      resetCabinetSelections: () => set((state) => ({
        activeCabinets: state.activeCabinets.map(cabinet => ({
          ...cabinet,
          selected: false
        })),
        comment: ''
      })),
      
      selectAllCabinets: (selected) => set((state) => ({
        activeCabinets: state.activeCabinets.map(cabinet => ({
          ...cabinet,
          selected
        }))
      })),
      
      getSelectedCabinets: () => {
        return get().activeCabinets.filter(cabinet => cabinet.selected);
      },
      
      getSelectedIds: () => {
        return get().activeCabinets
          .filter(cabinet => cabinet.selected)
          .map(cabinet => cabinet.id);
      }
    }),
    {
      name: 'work-session-storage',
      // Сохраняем только выбранные ID кабинетов и комментарий
      partialize: (state) => {
        const selectedIds = state.activeCabinets
          .filter(cabinet => cabinet.selected)
          .map(cabinet => cabinet.id);
          
        return {
          selectedCabinetIds: selectedIds,
          comment: state.comment
        };
      },
      // Мерж сохраненного состояния с новым при загрузке
      onRehydrateStorage: () => (state) => {
        if (!state) return;
        
        // Здесь можно выполнить дополнительные действия при восстановлении 
        // состояния, если необходимо
        console.log("Work session store rehydrated");
      }
    }
  )
);