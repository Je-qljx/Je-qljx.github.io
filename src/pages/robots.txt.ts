export async function GET() {
  const robots = `User-agent: *
Allow: /
Sitemap: https://Je-qljx.github.io/sitemap-index.xml
`;
  return new Response(robots, {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
}