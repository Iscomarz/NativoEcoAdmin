import {
	obtenerHeroVideo,
	obtenerNavbarSiempreBlanco
} from '$lib/services/configuracionSitioService';
import type { PageServerLoad } from './$types';

export const prerender = false;

export const load: PageServerLoad = async () => {
	const [heroVideo, navbarSiempreBlanco] = await Promise.all([
		obtenerHeroVideo(),
		obtenerNavbarSiempreBlanco()
	]);

	return {
		heroVideo,
		navbarSiempreBlanco
	};
};
