const ghPages = require("gh-pages");

ghPages.publish(
  "src",
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
