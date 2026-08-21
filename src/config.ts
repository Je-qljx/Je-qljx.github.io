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
  bio: '我是一名学生，热爱编程与软件开发，同时也是一位 AI 探索者，喜欢尝试新事物，用代码和 AI 创造有趣的作品。',
  socials: {
    github: 'https://github.com/Je-qljx', // TODO(user): replace with real content
    email: 'TODO(user): replace with real content',
  },
  location: 'TODO(user): replace with real content',
};
