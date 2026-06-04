<script lang="ts">
	import { fade, slide } from 'svelte/transition';
	import { onMount } from 'svelte';

	let { 
		fechaInicio = $bindable(''), 
		fechaFin = $bindable(''),
		onClear
	}: { 
		fechaInicio: string; 
		fechaFin: string;
		onClear?: () => void;
	} = $props();

	let isOpen = $state(false);
	let currentMonth = $state(new Date());
	let tempInicio = $state<Date | null>(null);
	let tempFin = $state<Date | null>(null);

	// Sincronizar estado interno con props vinculadas
	$effect(() => {
		if (fechaInicio) {
			const d = new Date(fechaInicio + 'T00:00:00');
			if (!tempInicio || tempInicio.getTime() !== d.getTime()) {
				tempInicio = d;
			}
		} else {
			tempInicio = null;
		}

		if (fechaFin) {
			const d = new Date(fechaFin + 'T00:00:00');
			if (!tempFin || tempFin.getTime() !== d.getTime()) {
				tempFin = d;
			}
		} else {
			tempFin = null;
		}
	});

	const daysOfWeek = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
	const months = [
		'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
		'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
	];

	function getDaysInMonth(year: number, month: number) {
		return new Date(year, month + 1, 0).getDate();
	}

	function getFirstDayOfMonth(year: number, month: number) {
		return new Date(year, month, 1).getDay();
	}

	let calendarDays = $derived.by(() => {
		const year = currentMonth.getFullYear();
		const month = currentMonth.getMonth();
		const daysInMonth = getDaysInMonth(year, month);
		const firstDay = getFirstDayOfMonth(year, month);
		
		const days = [];
		for (let i = 0; i < firstDay; i++) days.push(null);
		for (let i = 1; i <= daysInMonth; i++) days.push(new Date(year, month, i));
		return days;
	});

	function handleDayClick(date: Date) {
		const clickedDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
		
		if (!tempInicio || (tempInicio && tempFin)) {
			tempInicio = clickedDate;
			tempFin = null;
			fechaInicio = clickedDate.toISOString().split('T')[0];
			fechaFin = ''; 
		} else {
			if (clickedDate < tempInicio) {
				tempFin = tempInicio;
				tempInicio = clickedDate;
			} else {
				tempFin = clickedDate;
			}
			applyRange();
		}
	}

	function applyRange() {
		if (tempInicio) fechaInicio = tempInicio.toISOString().split('T')[0];
		if (tempFin) {
			fechaFin = tempFin.toISOString().split('T')[0];
			isOpen = false;
		}
	}

	function changeMonth(delta: number) {
		currentMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + delta, 1);
	}

	function isSelected(date: Date | null) {
		if (!date || !tempInicio) return false;
		const t = date.getTime();
		return t === tempInicio.getTime() || (tempFin && t === tempFin.getTime());
	}

	function isInRange(date: Date | null) {
		if (!date || !tempInicio || !tempFin) return false;
		const t = date.getTime();
		return t > tempInicio.getTime() && t < tempFin.getTime();
	}

	function formatDisplayDate(dateStr: string) {
		if (!dateStr) return '';
		const d = new Date(dateStr + 'T00:00:00');
		return `${d.getDate()} ${months[d.getMonth()].substring(0, 3)}`;
	}

	function fastSelect(dias: number) {
		const hoy = new Date();
		const inicio = new Date();
		inicio.setDate(hoy.getDate() - dias);
		setRange(inicio, hoy);
	}

	function fastSelectThisMonth() {
		const hoy = new Date();
		const inicio = new Date(hoy.getFullYear(), hoy.getMonth(), 1);
		setRange(inicio, hoy);
	}

	function fastSelectMonth() {
		const hoy = new Date();
		const inicio = new Date(hoy.getFullYear(), hoy.getMonth() - 1, 1);
		const fin = new Date(hoy.getFullYear(), hoy.getMonth(), 0);
		setRange(inicio, fin);
	}

	function setRange(inicio: Date, fin: Date) {
		tempInicio = new Date(inicio.getFullYear(), inicio.getMonth(), inicio.getDate());
		tempFin = new Date(fin.getFullYear(), fin.getMonth(), fin.getDate());
		applyRange();
	}

	function clear() {
		fechaInicio = '';
		fechaFin = '';
		tempInicio = null;
		tempFin = null;
		if (onClear) onClear();
		isOpen = false;
	}

	let container: HTMLElement;
	function handleClickOutside(event: MouseEvent) {
		if (isOpen && container && !container.contains(event.target as Node)) {
			isOpen = false;
		}
	}

	onMount(() => {
		document.addEventListener('click', handleClickOutside);
		return () => document.removeEventListener('click', handleClickOutside);
	});

	// Constantes de estilo para evitar @apply
	const shortcutClass = "px-2 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-[10px] text-white/60 transition";
</script>

<div class="relative inline-block w-full" bind:this={container}>
	<button
		type="button"
		onclick={() => isOpen = !isOpen}
		class="premium-input w-full px-4 py-2.5 text-sm flex items-center justify-between group"
	>
		<div class="flex items-center gap-2">
			<i class="ph ph-calendar-blank text-brand-400 text-lg"></i>
			<span class={fechaInicio ? 'text-white' : 'text-white/30'}>
				{#if fechaInicio && fechaFin}
					{formatDisplayDate(fechaInicio)} — {formatDisplayDate(fechaFin)}
				{:else if fechaInicio}
					Desde {formatDisplayDate(fechaInicio)}...
				{:else}
					Seleccionar periodo
				{/if}
			</span>
		</div>
		<i class="ph ph-caret-down text-white/20 group-hover:text-white/40 transition"></i>
	</button>

	{#if isOpen}
		<div
			transition:slide={{ duration: 200 }}
			class="absolute top-full left-0 mt-2 z-[999] w-full sm:w-[320px] bg-[#0a140e] backdrop-blur-2xl shadow-2xl border border-white/10 p-4 rounded-2xl"
		>
			<div class="flex flex-wrap gap-2 mb-4 pb-4 border-b border-white/5">
				<button onclick={() => fastSelect(7)} class={shortcutClass}>7d</button>
				<button onclick={() => fastSelect(30)} class={shortcutClass}>30d</button>
				<button onclick={fastSelectThisMonth} class={shortcutClass}>Este mes</button>
				<button onclick={fastSelectMonth} class={shortcutClass}>Mes pasado</button>
				<button onclick={clear} class="px-2 py-1 rounded-lg bg-red-500/5 hover:bg-red-500/10 text-[10px] text-red-400 transition ml-auto">Limpiar</button>
			</div>

			<div class="flex items-center justify-between mb-4">
				<button onclick={() => changeMonth(-1)} class="p-1 hover:bg-white/5 rounded-lg transition">
					<i class="ph ph-caret-left"></i>
				</button>
				<span class="text-sm font-bold text-white uppercase tracking-wider">
					{months[currentMonth.getMonth()]} {currentMonth.getFullYear()}
				</span>
				<button onclick={() => changeMonth(1)} class="p-1 hover:bg-white/5 rounded-lg transition">
					<i class="ph ph-caret-right"></i>
				</button>
			</div>

			<div class="grid grid-cols-7 gap-1">
				{#each daysOfWeek as day}
					<div class="text-center text-[10px] font-bold text-white/20 py-1 uppercase">{day}</div>
				{/each}
				
				{#each calendarDays as date}
					{#if date}
						{@const selected = isSelected(date)}
						{@const inRange = isInRange(date)}
						<button
							onclick={() => handleDayClick(date)}
							class="aspect-square flex items-center justify-center text-xs rounded-lg transition-all relative
							{selected ? 'bg-brand-500 text-white font-bold shadow-lg shadow-brand-500/20 z-10' : ''}
							{inRange ? 'bg-brand-500/10 text-brand-400' : 'text-white/60 hover:bg-white/5'}
							{!selected && !inRange && date.toDateString() === new Date().toDateString() ? 'border border-brand-500/30' : ''}"
						>
							{date.getDate()}
						</button>
					{:else}
						<div class="aspect-square"></div>
					{/if}
				{/each}
			</div>

			<div class="mt-4 pt-4 border-t border-white/5 flex justify-between items-center">
				<p class="text-[10px] text-white/30 italic">
					{tempInicio && !tempFin ? 'Selecciona fecha final' : 'Rango completo'}
				</p>
				<button onclick={() => isOpen = false} class="btn-primary py-1.5 px-4 text-xs">Cerrar</button>
			</div>
		</div>
	{/if}
</div>

<style>
	:global(.glass-card) {
		backdrop-filter: blur(16px);
		-webkit-backdrop-filter: blur(16px);
	}
</style>
