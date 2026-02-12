import { Devvit } from "@devvit/public-api";
import App from "./client/game/App";

Devvit.configure({
  redditAPI: false,
});

Devvit.addCustomPostType({
  name: "PUZZORA",
  render: () => <App />,
  splash: {
    appDisplayName: "PUZZORA",
    heading: "🧩 PUZZORA",
    description: "A daily image puzzle cracked by the community",
    buttonLabel: "Start Playing",
    backgroundUri: "/splash-purple.svg",
    appIconUri: "/puzzora-icon.svg",
  },
});

export default Devvit;
