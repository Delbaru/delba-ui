import { browserUrl, kitRoot } from './environment';

export default async function verifyFixtureOwner() {
  const response = await fetch(`${browserUrl}/__ui_fixture__`);
  const identity = await response.json().catch(() => null) as { kitRoot?: string } | null;
  if (identity?.kitRoot !== kitRoot) {
    throw new Error(`UI browser fixture at ${browserUrl} belongs to another checkout. Set a free UI_BROWSER_PORT; do not reuse or stop the other project.`);
  }
}
