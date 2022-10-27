module.exports = {
	// for repo: danamag/stremio-addons-list
	"repository": "stremio-addons-list",
	"author": "danamag",
	"netlify-domain": "stremio-addons.netlify.app",
	"page-title": "Stremio Community Addons List",
	"meta-favicon": "stremio_community_logo.png",
	"meta-title": "Stremio Addons - Community List",
	"meta-description": "Stremio community currated addons list, find the best Stremio addons here.",
	"meta-keywords": "stremio addons, no streams, addons, torrentio, piratebay, addons list, what addons",
	// this gets appended to the title, ex: "TMDB Addon - Stremio Addons"
	"meta-addon-title-append": "Stremio Addons",
	// for 12h since last full update, it will prefer cached manifests over retrieving new ones
	"prefer-cached-for": 12 * 60 * 60 * 1000,
	// when min score is reached the addon will be removed / issue closed
	"minimum-score": -10,
	// optional label id, if available it will add a label when closing an issue due to low score, this id adds the label "very low score"
	"label-id-for-close-issues": "LA_kwDOFVUyTM8AAAABGbO_Bw",
	// sane timeouts for needle so it doesn't get stuck in a request
	"needle": { "open_timeout": 5000, "response_timeout": 5000, "read_timeout": 5000, "follow_max": 5 }
}
