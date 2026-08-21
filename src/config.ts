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
  tagline: 'TODO(user): replace with real content',
  bio: 'TODO(user): replace with real content',
  socials: {
    github: 'https://github.com/Je-qljx', // TODO(user): replace with real content
    email: 'TODO(user): replace with real content',
  },
  location: 'TODO(user): replace with real content',
};
