const ghPages = require("gh-pages");

ghPages.publish(
	"dist",
	{
		message: "Deploy",
	},
	(err) => {
		if (err) {
			console.error(err);
		} else {
			console.log("Deployed to GitHub Pages");
		}
	}
);
