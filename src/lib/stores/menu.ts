import { writable } from 'svelte/store';

interface MenuState {
    [key: string]: boolean;
}

function createMenuStore() {
    const { subscribe, set, update } = writable<MenuState>({
        catalogos: false,
        experiencias: false,
        reportes: false
    });

    return {
        subscribe,
        toggle: (menu: string) => {
            update(state => ({
                ...state,
                [menu]: !state[menu]
            }));
        },
        closeAll: () => {
            set({
                catalogos: false,
                experiencias: false,
                reportes: false
            });
        }
    };
}

export const menuState = createMenuStore();
