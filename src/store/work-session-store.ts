import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { isEqual } from 'lodash';

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
  updateSelections: (selectedIds: number[]) => void;
  
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
      
      // Обновить только выделение кабинетов без их удаления из списка
      updateSelections: (selectedIds: number[]) => set((state) => ({
        activeCabinets: state.activeCabinets.map(cabinet => ({
          ...cabinet,
          selected: selectedIds.includes(cabinet.id)
        }))
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
          // Сохраняем все кабинеты для возможности повторного использования
          allCabinets: state.activeCabinets.map(({ id, idexId, login, password }) => ({ 
            id, idexId, login, password 
          })),
          comment: state.comment
        };
      },
      // Мерж сохраненного состояния с новым при загрузке
      onRehydrateStorage: () => (state, storageState) => {
        if (!state || !storageState) return;

        try {
          const parsedState = JSON.parse(storageState as string);
          const { selectedCabinetIds = [], allCabinets = [] } = parsedState.state;

          // Не теряем кабинеты при инициализации, даже если они не выбраны
          if (allCabinets && Array.isArray(allCabinets) && allCabinets.length > 0) {
            // Добавляем поле selected каждому кабинету
            const cabinetsWithSelection = allCabinets.map(cabinet => ({
              ...cabinet,
              selected: selectedCabinetIds.includes(cabinet.id)
            }));
            
            // Обновляем хранилище
            state.setActiveCabinets(cabinetsWithSelection);
          }
          
          console.log("Work session store rehydrated with", allCabinets.length, "cabinets");
        } catch (error) {
          console.error("Error rehydrating work session store:", error);
        }
      }
    }
  )
);