export interface MatrixEntry {
  name: string;
  url: string;
  relation: string;
  description: string;
  role?: string;
  tags: string[];
}

// 与我有关的人和团队。新增条目直接往这里加即可。
export const matrixEntries: MatrixEntry[] = [
  {
    name: '新技元 OriGen',
    url: 'https://origenclub.cn/',
    relation: '团队成员',
    description:
      '江苏省常州高级中学的技术驱动学生社团，专注于技术创新与实践，涵盖直播、设计、开发与摄影等方向。',
    role: '本人在该组织中负责直播转播业务和技术支持，作为团队首批成员，积累了丰富的实战经验。',
    tags: ['学生社团', '技术创新'],
  },
];
