import { Devvit } from "@devvit/public-api";
import App from "./client/game/App";

Devvit.configure({ redditAPI: true });

Devvit.addCustomPostType({
  name: "PUZZORA",
  // @ts-expect-error Devvit Web supports React components in render
  render: (context) => <App context={context} />,
});

export default Devvit;
