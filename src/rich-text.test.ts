import assert from 'node:assert/strict';
import test from 'node:test';

// Модуль с `.scss` в графе под node не грузится вовсе (`Invalid or unexpected token`),
// поэтому сам импорт входа и есть проверка.
test('@delba/ui/rich-text грузится в node без компонентов и SCSS', async () => {
  const entry = await import('./rich-text');
  assert.ok(entry.RICH_ROLES.includes('p'));
  assert.equal(entry.sanitizeRichTextHtml('<p onclick="x()">a<script>b</script></p>'), '<p>a</p>');
});
