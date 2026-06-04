<script lang="ts">
	import { auth } from '$lib/stores/auth';
	import { goto } from '$app/navigation';
	import { toast } from 'svelte-sonner';
	import logoNativo from '$lib/assets/logos/logoNativo.png';

	let email = '';
	let password = '';
	let error = '';
	let loading = false;
	let showSignup = false;

	async function handleLogin() {
		error = '';
		loading = true;

		const result = await auth.login(email, password);

		if (result.success) {
			toast.success('¡Sesión iniciada correctamente!');
			goto('/dashboard');
		} else {
			error = result.error || 'Credenciales inválidas. Intenta de nuevo.';
			toast.error(error);
		}

		loading = false;
	}

	async function handleSignup() {
		error = '';
		loading = true;

		const result = await auth.signup(email, password);

		if (result.success) {
			toast.success('Registro exitoso. Por favor, inicia sesión.');
			email = '';
			password = '';
			showSignup = false;
		} else {
			error = result.error || 'Error al registrar. Intenta de nuevo.';
			toast.error(error);
		}

		loading = false;
	}

	function handleSubmit(e: Event) {
		e.preventDefault();
		if (showSignup) {
			handleSignup();
		} else {
			handleLogin();
		}
	}

	function toggleForm() {
		showSignup = !showSignup;
		error = '';
	}
</script>

<div class="min-h-screen flex items-center justify-center bg-body px-4">
	<!-- Decorative background elements -->
	<div class="fixed inset-0 pointer-events-none overflow-hidden">
		<div class="absolute top-1/4 left-1/4 w-96 h-96 bg-brand-500/5 rounded-full blur-3xl"></div>
		<div class="absolute bottom-1/4 right-1/4 w-72 h-72 bg-brand-600/4 rounded-full blur-3xl"></div>
	</div>

	<div class="glass-card-strong p-8 sm:p-10 w-full max-w-md relative z-10 animate-slide-up">
		<div class="text-center mb-8">
			<div class="flex justify-center mb-3">
				<img src={logoNativo} alt="Nativo Tours" class="h-20 w-auto object-contain" />
			</div>
			<p class="text-white/50 text-sm tracking-wider">Nativo Tours Admin</p>
		</div>

		<form on:submit={handleSubmit} class="space-y-5">
			<div>
				<label for="email" class="block text-sm font-medium text-white/80 mb-2">
					Correo Electrónico
				</label>
				<input
					type="email"
					id="email"
					bind:value={email}
					required
					disabled={loading}
					class="premium-input w-full px-4 py-3"
					placeholder="tu@email.com"
				/>
			</div>

			<div>
				<label for="password" class="block text-sm font-medium text-white/80 mb-2">
					Contraseña
				</label>
				<input
					type="password"
					id="password"
					bind:value={password}
					required
					minlength="6"
					disabled={loading}
					class="premium-input w-full px-4 py-3"
					placeholder="••••••••"
				/>
			</div>

			{#if error}
				<div
					class="bg-red-500/10 border border-red-500/25 text-red-300 px-4 py-3 rounded-[var(--radius-input)] text-sm"
				>
					{error}
				</div>
			{/if}

			<button type="submit" disabled={loading} class="btn-primary w-full py-3 text-sm">
				{#if loading}
					<span>Cargando...</span>
				{:else}
					<span>{showSignup ? 'Registrarse' : 'Iniciar Sesión'}</span>
				{/if}
			</button>
		</form>

		<!-- <div class="mt-6 text-center">
			<button
				type="button"
				on:click={toggleForm}
				disabled={loading}
				class="text-sm text-brand-400 hover:text-brand-300 transition disabled:opacity-50"
			>
				{showSignup
					? '¿Ya tienes cuenta? Inicia sesión'
					: '¿No tienes cuenta? Regístrate'}
			</button>
		</div> -->

		<div class="mt-8 text-center text-xs text-white/25">
			<p>Versión 1.0.0</p>
		</div>
	</div>
</div>
