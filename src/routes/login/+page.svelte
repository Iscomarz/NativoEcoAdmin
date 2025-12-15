<script lang="ts">
	import { auth } from '$lib/stores/auth';
	import { goto } from '$app/navigation';
	import { toast } from 'svelte-sonner';

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

<div class="min-h-screen flex items-center justify-center bg-black">
	<div class="bg-neutral-900 rounded-lg shadow-2xl p-8 w-full max-w-md border border-green-700">
		<div class="text-center mb-8">
			<h1 class="text-3xl font-bold text-white mb-2">Nativo Tours</h1>
			<p class="text-green-400">Administración</p>
		</div>

		<form on:submit={handleSubmit} class="space-y-6">
			<div>
				<label for="email" class="block text-sm font-medium text-white mb-2">
					Correo Electrónico
				</label>
				<input
					type="email"
					id="email"
					bind:value={email}
					required
					disabled={loading}
					class="w-full px-4 py-3 bg-neutral-800 border border-green-700 text-white rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none transition disabled:opacity-50"
					placeholder="tu@email.com"
				/>
			</div>

			<div>
				<label for="password" class="block text-sm font-medium text-white mb-2">
					Contraseña
				</label>
				<input
					type="password"
					id="password"
					bind:value={password}
					required
					minlength="6"
					disabled={loading}
					class="w-full px-4 py-3 bg-neutral-800 border border-green-700 text-white rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none transition disabled:opacity-50"
					placeholder="••••••••"
				/>
			</div>

			{#if error}
				<div class="bg-red-900/50 border border-red-500 text-red-200 px-4 py-3 rounded-lg text-sm">
					{error}
				</div>
			{/if}

			<button
				type="submit"
				disabled={loading}
				class="w-full bg-green-700 hover:bg-green-600 text-white font-semibold py-3 rounded-lg transition duration-200 shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
			>
				{#if loading}
					<span>Cargando...</span>
				{:else}
					<span>{showSignup ? 'Registrarse' : 'Iniciar Sesión'}</span>
				{/if}
			</button>
		</form>

		<div class="mt-6 text-center">
			<button
				type="button"
				on:click={toggleForm}
				disabled={loading}
				class="text-sm text-green-400 hover:text-green-300 transition disabled:opacity-50"
			>
				{showSignup
					? '¿Ya tienes cuenta? Inicia sesión'
					: '¿No tienes cuenta? Regístrate'}
			</button>
		</div>

		<div class="mt-6 text-center text-sm text-gray-400">
			<p>Versión 1.0.0</p>
		</div>
	</div>
</div>

<style>
	:global(body) {
		margin: 0;
		padding: 0;
	}
</style>
