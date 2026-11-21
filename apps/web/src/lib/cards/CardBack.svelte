<script lang="ts">
	import {
		countryName,
		formatCardNumber,
		formatCareer,
		formatFee,
		formatLicense,
		listRatings,
		type CardBackProps
	} from './card-back.ts';
	import { loadGoalCounts, type GoalCounts } from '../data/load-goal-counts.ts';

	const card: CardBackProps = $props();
	// The player's record on the site holds the goal counts the card list leaves out.
	let loaded = $state<GoalCounts>({});
	$effect(() => {
		const id = card.playerId;
		if (id === undefined || typeof fetch === 'undefined') return;
		let isCurrent = true;
		void loadGoalCounts((path) => fetch(path), id).then((counts) => {
			if (isCurrent) loaded = counts;
		});
		return () => {
			isCurrent = false;
		};
	});
	const clubGoals = $derived(card.clubGoalCount ?? loaded.clubGoalCount);
	const countryGoals = $derived(card.nationalTeamGoalCount ?? loaded.nationalTeamGoalCount);
	// An absent fact has no tile, so a child never reads a made-up zero. The overall fills the
	// row when a card has fewer than three facts, as the prototype's back has three tiles.
	const facts = $derived.by(() => {
		const known = [
			['PLAYED', formatCareer(card.careerStartYear, card.careerEndYear)],
			['CLUB GOALS', clubGoals?.toString()],
			['COUNTRY GOALS', countryGoals?.toString()],
			['TRANSFER FEE', card.transferFee && formatFee(card.transferFee)]
		].filter(([, value]) => value);
		const overall = card.about?.overall.toString();
		return known.length < 3 && overall !== undefined ? [...known, ['OVERALL', overall]] : known;
	});
	const awards = $derived(card.awards ?? []);
	const about = $derived(card.about);
	const meta = $derived(
		about === undefined
			? ''
			: [
					about.positionName,
					about.clubName,
					about.nationalTeamCode && countryName(about.nationalTeamCode)
				]
					.filter(Boolean)
					.join(' · ')
	);
</script>

<div class={['card', about?.tierName.toLowerCase()]}>
	<div class="back">
		{#if about}
			<div class="brand">
				<span>Soccer Cards</span>
				{#if about.cardNumber !== undefined}<i>{formatCardNumber(about.cardNumber)}</i>{/if}
			</div>
			<p class="fullname">{about.displayName}</p>
			<p class="meta">{meta}</p>
		{/if}
		<dl class="ratings">
			{#each listRatings(card.ratings) as rating (rating.label)}
				<div>
					<dt>{rating.label}</dt>
					<dd class="track">
						<svg viewBox="0 0 100 1" preserveAspectRatio="none" aria-hidden="true">
							<rect width={rating.value} height="1" />
						</svg>
					</dd>
					<dd class="num">{rating.value}</dd>
				</div>
			{/each}
		</dl>
		{#if facts.length > 0}
			<dl class="facts">
				{#each facts as [label, value] (label)}<div>
						<dt>{label}</dt>
						<dd>{value}</dd>
					</div>{/each}
			</dl>
		{/if}
		{#if awards.length > 0}
			<div class="awards">
				<strong>AWARDS</strong>
				<ul>
					{#each awards as award, index (index)}<li>{award}</li>{/each}
				</ul>
			</div>
		{/if}
		<div class="credit">
			<span
				>{#if card.photoCredit}Photo: {card.photoCredit.author}, {formatLicense(
						card.photoCredit.licenseCode
					)}, via Wikimedia Commons{:else}No photo yet{/if}</span
			>
			{#if about}<span class="kind">{about.tierName} card</span>{/if}
		</div>
		<div class="frame" aria-hidden="true"></div>
	</div>
</div>

<style>
	/* .card is the size container, so cqw inside it measures the card, as on the front. */
	.card {
		width: 100%;
		aspect-ratio: 5 / 7;
		container-type: inline-size;
	}
	/* The card keeps its own paper and ink in either page theme. The ground takes the tier's
	   colour, as the front does. */
	.card {
		--g2: #0b5c3a;
	}
	.legend {
		--g2: #8a5a10;
	}
	.icon {
		--g2: #5b2a7a;
	}
	.back {
		position: relative;
		box-sizing: border-box;
		display: flex;
		flex-direction: column;
		gap: 2.8cqw;
		height: 100%;
		padding: 5.5cqw 6cqw 4.5cqw;
		overflow: hidden;
		border-radius: 5cqw;
		background:
			repeating-linear-gradient(62deg, #fff0 0 5cqw, #ffffff0d 5cqw 10cqw),
			linear-gradient(200deg, var(--g2), #fff0 62%) var(--card-ink);
		box-shadow: 0 2cqw 6cqw var(--card-shadow);
		color: var(--card-paper);
		font: 800 4cqw/1 var(--font-data, sans-serif);
		/* A dialog may centre its text; the back reads from the left, as in the prototype. */
		text-align: left;
	}
	/* Without an award box the ratings take the spare room, so the back isn't top-heavy. */
	.ratings {
		flex: 1 1 auto;
		align-content: space-evenly;
	}
	dl,
	dd,
	ul,
	p {
		margin: 0;
		padding: 0;
	}
	.ratings {
		display: grid;
		gap: 1.7cqw;
	}
	.ratings div {
		display: grid;
		grid-template-columns: 17cqw 1fr 8cqw;
		align-items: center;
		gap: 2cqw;
		letter-spacing: 0.08em;
	}
	.track {
		height: 2.4cqw;
		overflow: hidden;
		border-radius: 2cqw;
		background: #ffffff29;
	}
	.track svg {
		display: block;
		width: 100%;
		height: 100%;
		fill: var(--booking);
	}
	.num {
		text-align: right;
		font: italic 800 5cqw/1 var(--font-data, sans-serif);
	}
	.facts {
		display: grid;
		grid-auto-columns: 1fr;
		grid-auto-flow: column;
		gap: 1.6cqw;
	}
	/* The value reads first, over its label, as in the prototype. */
	.facts div {
		display: flex;
		flex-direction: column-reverse;
		gap: 0.8cqw;
		padding: 2.2cqw 1cqw 1.8cqw;
		text-align: center;
	}
	.facts dd {
		font: italic 800 5.6cqw/0.9 var(--font-data, sans-serif);
		white-space: nowrap;
	}
	.facts div,
	.awards {
		border-radius: 2cqw;
		background: #ffffff1a;
	}
	.facts dt,
	.awards strong {
		color: var(--booking);
		font-size: 2.6cqw;
		letter-spacing: 0.08em;
	}
	/* The awards take the room left and run on as one paragraph, so eight fit above the credit. */
	.awards {
		flex: 1 1 auto;
		min-height: 0;
		overflow: hidden;
		padding: 2.4cqw 3cqw;
		font: 600 3.1cqw/1.25 var(--font-body, sans-serif);
	}
	.awards ul {
		margin-top: 1cqw;
		list-style: none;
	}
	.awards li {
		display: inline;
	}
	.awards li + li::before {
		content: ' · ';
	}
	.brand {
		display: flex;
		align-items: center;
		justify-content: space-between;
		font-size: 3.8cqw;
		letter-spacing: 0.18em;
		text-transform: uppercase;
	}
	.brand i {
		padding: 1cqw 1.8cqw 0.8cqw;
		border-radius: 0.8cqw;
		background: var(--booking);
		color: var(--booking-ink);
		font-style: normal;
		letter-spacing: 0.1em;
	}
	.fullname {
		font: 400 7.6cqw/1.02 var(--font-display, sans-serif);
		text-transform: uppercase;
	}
	.meta {
		margin-top: -1.2cqw;
		opacity: 0.85;
		font: 600 4.2cqw/1.2 var(--font-data, sans-serif);
		letter-spacing: 0.08em;
		text-transform: uppercase;
	}
	.credit {
		display: flex;
		align-items: end;
		justify-content: space-between;
		gap: 3cqw;
		margin-top: auto;
		opacity: 0.75;
		font: 600 2.7cqw/1.2 var(--font-data, sans-serif);
		letter-spacing: 0.04em;
	}
	.kind {
		white-space: nowrap;
	}
	/* The tier frame, as on the front: white, chrome, gold or prism. */
	.frame {
		position: absolute;
		inset: 0;
		padding: 2cqw;
		border-radius: inherit;
		background: linear-gradient(160deg, #fff, #dce4ec 60%, #fff);
		pointer-events: none;
		mask:
			linear-gradient(#000 0 0) content-box exclude,
			linear-gradient(#000 0 0);
	}
	.rare .frame {
		background: conic-gradient(
			from 210deg,
			#f6f8fb,
			#8c99a8,
			#fff,
			#6e7a89,
			#e8edf3,
			#a3afbd,
			#f6f8fb
		);
	}
	.legend .frame {
		background: conic-gradient(
			from 210deg,
			#fff4b8,
			#c8920f,
			#fff9dc,
			#94650a,
			#ffe27a,
			#b07a0c,
			#fff4b8
		);
	}
	.icon .frame {
		background: conic-gradient(
			from 210deg,
			#ffd86b,
			#ff7ad9,
			#7ad7ff,
			#8dffa0,
			#ffe27a,
			#c18cff,
			#ffd86b
		);
	}
</style>
