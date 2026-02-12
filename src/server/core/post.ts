import { reddit } from '@devvit/web/server';

export const createPost = async () => {
  const date = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return await reddit.submitCustomPost({
    title: '🧩 PUZZORA - Daily Image Puzzle',
    splash: {
      appDisplayName: 'PUZZORA',
      heading: '🧩 PUZZORA',
      description: `A daily image puzzle cracked by the community • ${date}`,
      buttonLabel: 'Start Playing',
      backgroundUri: '/splash-purple.svg',
      appIconUri: '/puzzora-icon.svg',
    },
  });
};
