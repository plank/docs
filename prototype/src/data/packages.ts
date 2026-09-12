// PROTOTYPE stand-in for what the router run reads from each Package's Docs Config (ADR 0004).
// Every field here is something the landing page consumed; that list feeds
// "What must a Package provide to the Docs Site?". Summaries and samples come from each
// Package's own README and docs; nothing is invented.
export type Package = {
	repo: string;
	name: string;
	composer: string;
	majors: string[];
	/** Authored for the prototype from the summary; a placeholder, not Package copy. */
	tagline: string;
	summary: string;
	status?: string;
	sampleLabel: string;
	sample: string;
	shape: 'yellow' | 'coral' | 'blue';
};

export const packages: Package[] = [
	{
		repo: 'publisher',
		name: 'Publisher',
		composer: 'plank/publisher',
		majors: ['13.x', '12.x', '11.x', '10.x'],
		tagline: 'Drafts and published content, side by side.',
		summary:
			"A content publishing workflow for Eloquent models. Published and draft versions live side by side, so editors can change a draft without touching what's live until they publish.",
		sampleLabel: 'Make a model publishable',
		sample: `class Post extends Model implements Publishable
{
    use IsPublishable;
}`,
		shape: 'coral',
	},
	{
		repo: 'snapshots',
		name: 'Snapshots',
		composer: 'plank/snapshots',
		majors: ['13.x', '12.x', '11.x', '10.x'],
		status: 'In active development',
		tagline: "Your app's content, as it was at any version.",
		summary:
			"Version your app's content by replicating its database tables. Each snapshot is a browseable copy of your content at a point in time; change the active version to see your app as it was.",
		sampleLabel: 'Switch the active version',
		sample: `if ($version = Versions::byKey($version)) {
    Versions::setActive($version);
}`,
		shape: 'yellow',
	},
];

export const allMajors = [...new Set(packages.flatMap((p) => p.majors))].sort(
	(a, b) => parseFloat(b) - parseFloat(a),
);

export const newest = (p: Package) => [...p.majors].sort((a, b) => parseFloat(b) - parseFloat(a))[0];
