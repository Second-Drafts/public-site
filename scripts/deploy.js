import ghPages from "gh-pages";

ghPages.publish(
	"dist",
	{
		message: "Deploy",
		dotfiles: true,
	},
	(err) => {
		if (err) {
			console.error(err);
		} else {
			console.log("Deployed to GitHub Pages");
		}
	},
);
