<script lang="ts">
	import { describeCard, positionCode, TIER_NAMES, type CardFrontProps } from './card-front.ts';

	const card: CardFrontProps = $props();
	// Two avatars on one page each need their own clip path.
	const clipId = $props.id();
	// The prototype makes a name smaller once it passes this many letters.
	const LONG_NAME_LENGTH = 10;
	const STAR =
		'100,50 82.5,55.7 97,67.1 76.8,65.5 88.3,82.1 72.5,76.8 75,93.3 61.3,81 58.7,99.2 50,81 41.3,99.2 38,82.9 25,93.3 28.8,75.3 11.7,82.1 23.2,65.5 3,67.1 15.5,56.1 0,50 17.5,44.3 3,32.9 23.2,34.5 11.7,17.9 27.5,23.2 25,6.7 38.7,19 41.3,0.8 50,19 58.7,0.8 62,17.1 75,6.7 71.2,24.7 88.3,17.9 76.8,34.5 97,32.9 84.5,43.9';
</script>

<!-- One picture with one name: a screen reader hears the sentence, not each piece of text. -->
<div class={['card', card.tier.toLowerCase()]} role="img" aria-label={describeCard(card)}>
	<div class="ground"></div>
	<div class="foil"></div>
	<svg class="burst" viewBox="0 0 100 100" aria-hidden="true"><polygon points={STAR} /></svg>
	{#if card.tier !== 'BASE'}
		<svg class="burst two" viewBox="0 0 100 100" aria-hidden="true"><polygon points={STAR} /></svg>
	{/if}
	{#if card.photo}
		<div class="photo">
			<img
				src={card.photo.src}
				width={card.photo.widthPx}
				height={card.photo.heightPx}
				alt=""
				loading="lazy"
				decoding="async"
			/>
		</div>
	{:else}
		<!-- The prototype's kit avatar in a plain shirt: club colours aren't props yet. -->
		<svg class="avatar" viewBox="0 0 200 220" aria-hidden="true" fill="#0e1512">
			<clipPath id={clipId}>
				<path d="M14 220C14 160 34 128 76 116h48c42 12 62 44 62 104Z" />
			</clipPath>
			<rect x="86" y="92" width="28" height="34" rx="8" />
			<g clip-path="url(#{clipId})">
				<rect y="100" width="200" height="130" fill="#f4f7fa" />
				<path d="M76 116Q100 140 124 116v-8H76Z" />
			</g>
			<path
				d="M14 220C14 160 34 128 76 116h48c42 12 62 44 62 104"
				fill="none"
				stroke="#0e1512"
				stroke-width="5"
			/>
			<circle cx="100" cy="62" r="40" />
			<text x="100" y="196" fill="#1b1f3b">{card.shirtNumber}</text>
		</svg>
	{/if}
	<div class="overall"><b>{card.overall}</b><span>{positionCode(card.position)}</span></div>
	<div class="tier">{TIER_NAMES[card.tier]}</div>
	<div class="nation">{card.nationalTeamCode}</div>
	{#if card.cardTitle}<div class="title">{card.cardTitle}</div>{/if}
	<div class="plate">
		<div class="club">{card.clubName}</div>
		<div class={['name', card.displayName.length > LONG_NAME_LENGTH && 'long']}>
			{card.displayName}
		</div>
		<div class="stats">
			<div class="att"><b>{card.attack}</b><span>ATT</span></div>
			<div class="def"><b>{card.defence}</b><span>DEF</span></div>
			<div class="ctrl"><b>{card.control}</b><span>CTRL</span></div>
			<div class="total"><b>{card.attack + card.defence + card.control}</b><span>TOTAL</span></div>
		</div>
	</div>
	<div class="frame"></div>
</div>

<style>
	/* Every size comes from the card's own width (cqw), as in the prototype. Nothing
	   moves: the foil sits still, so reduced motion has nothing to stop. */
	.card {
		--g1: #2fcb7a;
		--g2: #0b5c3a;
		--burst: #ffc93c;
		--shine: #fff0, #fffb 5%, #96f0ff80 8%, #ffaaeb80 11%, #fff0 17%;
		position: relative;
		aspect-ratio: 5 / 7;
		container-type: inline-size;
		overflow: hidden;
		border-radius: 5cqw;
		background: var(--card-ink);
		box-shadow: 0 2cqw 6cqw var(--card-shadow);
		color: var(--card-paper);
		font: 800 4.2cqw/1 var(--font-data);
	}
	.card > * {
		position: absolute;
	}
	.ground,
	.foil,
	.frame {
		inset: 0;
	}
	.ground {
		background:
			radial-gradient(circle at 50% 36%, #ffffffeb, #fff0 32%),
			repeating-conic-gradient(from 4deg at 50% 36%, #ffffff3d 0 6deg, #fff0 6deg 12deg),
			radial-gradient(circle at 8% 6%, var(--g1), transparent 58%),
			radial-gradient(circle at 94% 66%, var(--g1), transparent 52%),
			radial-gradient(circle at 50% 36%, var(--g1), var(--g2) 96%);
	}
	.foil {
		opacity: var(--foil, 0);
		background: repeating-linear-gradient(115deg, var(--shine)) 30% 30% / 300% 300%;
	}
	.burst {
		left: 4%;
		top: 9%;
		width: 92%;
		fill: var(--burst);
	}
	.burst.two {
		transform: scale(0.8) rotate(11deg);
		fill: #ffffffe0;
	}
	.photo {
		inset: 13cqw 12% 40cqw;
		overflow: hidden;
		border: 1.3cqw solid var(--card-ink);
		border-radius: 38cqw 38cqw 3cqw 3cqw;
	}
	.photo img {
		width: 100%;
		height: 100%;
		object-fit: cover;
		object-position: 50% 12%;
	}
	.avatar {
		left: 13%;
		width: 74%;
		bottom: 41cqw;
	}
	.avatar text {
		text-anchor: middle;
		font: 800 56px var(--font-data);
		stroke: var(--card-ink);
		stroke-width: 2.5;
		paint-order: stroke;
	}
	.overall {
		inset: 5cqw auto auto 5cqw;
		display: grid;
		justify-items: center;
		gap: 0.6cqw;
		padding: 1.8cqw 2.6cqw 1.4cqw;
		border-radius: 2.4cqw;
		background: var(--overall, var(--card-paper));
		color: var(--card-ink);
		box-shadow: 1cqw 1cqw 0 var(--card-ink);
	}
	.overall b {
		font: italic 800 12cqw/0.82 var(--font-data);
	}
	.overall span {
		font-size: 4.4cqw;
	}
	.tier,
	.nation {
		top: 4cqw;
		padding: 1.3cqw 2cqw;
		border-radius: 1.4cqw;
		background: var(--card-ink);
		letter-spacing: 0.08em;
		text-transform: uppercase;
	}
	.tier {
		left: 50%;
		translate: -50%;
		border-radius: 99cqw;
		color: var(--tag, var(--card-paper));
		font-size: 4cqw;
		letter-spacing: 0.2em;
	}
	.nation {
		right: 4cqw;
	}
	.title,
	.club,
	.name {
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
		text-transform: uppercase;
	}
	.title {
		left: 4cqw;
		bottom: 38cqw;
		max-width: 88cqw;
		rotate: -5deg;
		transform-origin: left bottom;
		padding: 1.6cqw 3cqw 1.4cqw;
		background: var(--booking);
		color: var(--booking-ink);
		box-shadow: 1.2cqw 1.2cqw 0 var(--card-ink);
		font: 400 7.4cqw/1 var(--font-display);
	}
	.plate {
		inset: auto 0 0;
		display: grid;
		gap: 1.6cqw;
		padding: 4.4cqw 4cqw 4cqw;
		background: var(--card-ink);
		clip-path: polygon(0 3.2cqw, 100% 0, 100% 100%, 0 100%);
	}
	.club {
		opacity: 0.75;
		font-weight: 600;
		letter-spacing: 0.1em;
	}
	.name {
		font: 400 9.4cqw/1.1 var(--font-display);
	}
	.name.long {
		font-size: 7.6cqw;
		line-height: 1.24;
	}
	.stats {
		display: grid;
		grid-template-columns: repeat(3, 1fr) 1.25fr;
		gap: 1.6cqw;
		margin-top: 1cqw;
		color: var(--card-ink);
		text-align: center;
	}
	.stats > div {
		display: grid;
		gap: 0.4cqw;
		padding: 1.4cqw 0 1cqw;
		border-radius: 1.6cqw;
		background: var(--stat);
	}
	.stats b {
		font: italic 800 8.6cqw/0.9 var(--font-data);
	}
	.stats span {
		font-size: 3.2cqw;
		letter-spacing: 0.12em;
	}
	.att {
		--stat: var(--att);
	}
	.def {
		--stat: var(--def);
	}
	.ctrl {
		--stat: var(--ctrl);
	}
	.total {
		--stat: var(--booking);
	}
	.frame {
		z-index: 3;
		padding: 2cqw;
		border-radius: inherit;
		background: conic-gradient(from 210deg, var(--rim));
		mask:
			linear-gradient(#000 0 0) content-box exclude,
			linear-gradient(#000 0 0);
	}
	.base .frame {
		background: linear-gradient(160deg, #fff, #dce4ec 60%, #fff);
	}

	/* The tiers above base: rare (chrome), legend (gold) and icon (black and prism). */
	.rare {
		--g1: #7cc4f2;
		--g2: #1d5e9e;
		--burst: #dce4ec;
		--foil: 0.55;
		--tag: #dce4ec;
		--overall: linear-gradient(160deg, #fff, #b9c4d0);
		--rim: #f6f8fb, #8c99a8, #fff, #6e7a89, #e8edf3, #a3afbd, #f6f8fb;
	}
	.legend {
		--g1: #f5c542;
		--g2: #b8791a;
		--burst: #fff4b8;
		--foil: 0.75;
		--shine: #fff0, #fff5bed9 5%, #ffc85080 9%, #fff0 15%;
		--tag: #ffd86b;
		--overall: linear-gradient(160deg, #fff3a6, #d9a11a);
		--rim: #fff4b8, #c8920f, #fff9dc, #94650a, #ffe27a, #b07a0c, #fff4b8;
	}
	.icon {
		--burst: #ffd86b;
		--foil: 0.45;
		--shine: #fff0, #ff78dc99 4%, #78d7ff99 8%, #8cffa08c 12%, #ffd86b99 16%, #fff0 22%;
		--prism: #ff7ad980, #7ad7ff80, #8dffa073, #ffd86b80, #c18cff80, #ff7ad980;
		--overall: linear-gradient(160deg, #ffe7a0, #e0a82a);
		--rim: #ffd86b, #ff7ad9, #7ad7ff, #8dffa0, #ffe27a, #c18cff, #ffd86b;
	}
	.icon .foil {
		mix-blend-mode: color-dodge;
	}
	.icon .ground {
		background:
			radial-gradient(circle, #ffd86b8c 0.35cqw, transparent 0.5cqw) 0 0 / 5cqw 5cqw,
			radial-gradient(circle, #ffffff59 0.25cqw, transparent 0.4cqw) 2.5cqw 2.5cqw / 7cqw 7cqw,
			radial-gradient(circle at 50% 36%, #fff0becc, #fff0be00 30%),
			repeating-conic-gradient(from 4deg at 50% 36%, #ffd86b33 0 6deg, #ffd86b00 6deg 12deg),
			conic-gradient(from 200deg at 50% 36%, var(--prism)),
			linear-gradient(160deg, #26222e, #08070b);
	}
	.icon .tier {
		background: linear-gradient(90deg, #ffd86b, #ff7ad9, #7ad7ff);
		color: var(--card-ink);
	}
	.icon .name {
		color: #ffd86b;
	}
	.icon .title {
		background: linear-gradient(90deg, #ffd86b, #ff9ae0);
	}
	.icon .plate {
		background: linear-gradient(180deg, #17151c, #050407);
	}
</style>
