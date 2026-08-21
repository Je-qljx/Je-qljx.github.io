export interface SiteConfig {
  name: string;
  handle: string;
  tagline: string;
  bio: string;
  socials: {
    github: string;
    email: string;
  };
  location: string;
}

export const config: SiteConfig = {
  name: 'Je', // TODO(user): replace with real content
  handle: '@Je-qljx', // TODO(user): replace with real content
  tagline: '学生 · 开发爱好者 · AI 探索者',
  bio: '相信有趣的点子值得被实现——用技术把痛点解决，将难点落实。',
  socials: {
    github: 'https://github.com/Je-qljx', // TODO(user): replace with real content
    email: 'TODO(user): replace with real content',
  },
  location: 'TODO(user): replace with real content',
};
