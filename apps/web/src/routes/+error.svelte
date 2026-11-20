<script lang="ts">
	import { page } from '$app/state';
	import { resolve } from '$app/paths';

	const NOT_FOUND = 404;
	const heading = $derived(page.status === NOT_FOUND ? 'Page not found' : 'Something went wrong');
</script>

<svelte:head>
	<title>{heading} · Soccer Cards</title>
</svelte:head>

<main>
	<h1>{heading}</h1>
	<p><a href={resolve('/packs')}>Go to Packs</a></p>
</main>
