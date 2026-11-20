<script lang="ts">
	import { formatCareer, formatFee, listRatings, type CardBackProps } from './card-back.ts';

	const card: CardBackProps = $props();
	// An absent fact has no row, so a child never reads a made-up zero.
	const facts = $derived(
		[
			['PLAYED', formatCareer(card.careerStartYear, card.careerEndYear)],
			['CLUB GOALS', card.clubGoalCount?.toString()],
			['COUNTRY GOALS', card.nationalTeamGoalCount?.toString()],
			['TRANSFER FEE', card.transferFee && formatFee(card.transferFee)]
		].filter(([, value]) => value)
	);
	const awards = $derived(card.awards ?? []);
</script>

<div class="card">
	<div class="back">
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
		{#if card.photoCredit}
			<p class="credit">Photo: {card.photoCredit.author}, {card.photoCredit.licenseCode}</p>
		{/if}
	</div>
</div>

<style>
	/* .card is the size container, so cqw inside it measures the card, as on the front. */
	.card {
		width: 100%;
		aspect-ratio: 5 / 7;
		container-type: inline-size;
	}
	/* The card keeps its own paper and ink in either page theme. */
	.back {
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
			linear-gradient(200deg, #0b5c3a, #fff0 62%) var(--card-ink);
		box-shadow: 0 2cqw 6cqw var(--card-shadow);
		color: var(--card-paper);
		font: 800 4cqw/1 var(--font-data, sans-serif);
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
	.credit {
		margin-top: auto;
		opacity: 0.75;
		font: 600 2.7cqw/1.2 var(--font-data, sans-serif);
	}
</style>
