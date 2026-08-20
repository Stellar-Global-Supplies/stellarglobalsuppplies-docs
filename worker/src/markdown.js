// Lightweight Markdown → HTML converter (no npm deps, runs in Workers)

export function parseMarkdown(md) {
  if (!md) return { html: '', toc: [] };

  const toc = [];
  let html = md;

  // Normalize line endings
  html = html.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

  // Extract and process code blocks first (protect from other transforms)
  const codeBlocks = [];
  html = html.replace(/```(\w*)\n?([\s\S]*?)```/g, (_, lang, code) => {
    const idx = codeBlocks.length;
    const escaped = code
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
    codeBlocks.push(
      `<pre class="code-block"><code class="language-${lang || 'plaintext'}">${escaped}</code></pre>`
    );
    return `\x00CODE${idx}\x00`;
  });

  // Inline code
  html = html.replace(/`([^`]+)`/g, '<code class="inline-code">$1</code>');

  // Headings with anchor IDs for TOC
  html = html.replace(/^(#{1,6})\s+(.+)$/gm, (_, hashes, text) => {
    const level = hashes.length;
    const id = text
      .toLowerCase()
      .replace(/[^\w\s-]/g, '')
      .replace(/\s+/g, '-')
      .trim();
    const cleanText = text.replace(/\*\*(.+?)\*\*/g, '$1').replace(/`(.+?)`/g, '$1');
    toc.push({ level, text: cleanText, id });
    return `<h${level} id="${id}" class="doc-heading doc-h${level}"><a href="#${id}" class="heading-anchor">#</a>${text}</h${level}>`;
  });

  // Horizontal rules
  html = html.replace(/^[-*_]{3,}$/gm, '<hr class="doc-hr" />');

  // Blockquotes
  html = html.replace(/^>\s?(.+)$/gm, '<blockquote class="doc-blockquote">$1</blockquote>');

  // Bold + italic
  html = html.replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>');
  html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  html = html.replace(/__(.+?)__/g, '<strong>$1</strong>');
  html = html.replace(/\*(.+?)\*/g, '<em>$1</em>');
  html = html.replace(/_(.+?)_/g, '<em>$1</em>');

  // Strikethrough
  html = html.replace(/~~(.+?)~~/g, '<del>$1</del>');

  // Images (before links)
  html = html.replace(
    /!\[([^\]]*)\]\(([^)]+)\)/g,
    '<img src="$2" alt="$1" class="doc-image" loading="lazy" />'
  );

  // Links
  html = html.replace(
    /\[([^\]]+)\]\(([^)]+)\)/g,
    '<a href="$2" class="doc-link" target="_blank" rel="noopener noreferrer">$1</a>'
  );

  // Auto-links
  html = html.replace(
    /(?<![">])(https?:\/\/[^\s<>"]+)/g,
    '<a href="$1" class="doc-link" target="_blank" rel="noopener noreferrer">$1</a>'
  );

  // Tables
  html = html.replace(/(\|.+\|\n\|[-| :]+\|\n(?:\|.+\|\n?)+)/g, (table) => {
    const rows = table.trim().split('\n');
    const headers = rows[0].split('|').filter(Boolean).map((c) => c.trim());
    const body = rows.slice(2);
    const headerHtml = `<thead><tr>${headers.map((h) => `<th>${h}</th>`).join('')}</tr></thead>`;
    const bodyHtml = `<tbody>${body
      .map(
        (row) =>
          `<tr>${row
            .split('|')
            .filter(Boolean)
            .map((c) => `<td>${c.trim()}</td>`)
            .join('')}</tr>`
      )
      .join('')}</tbody>`;
    return `<div class="table-wrapper"><table class="doc-table">${headerHtml}${bodyHtml}</table></div>`;
  });

  // Unordered lists
  html = html.replace(/((?:^[-*+] .+\n?)+)/gm, (block) => {
    const items = block
      .trim()
      .split('\n')
      .map((line) => `<li>${line.replace(/^[-*+] /, '')}</li>`)
      .join('');
    return `<ul class="doc-list">${items}</ul>`;
  });

  // Ordered lists
  html = html.replace(/((?:^\d+\. .+\n?)+)/gm, (block) => {
    const items = block
      .trim()
      .split('\n')
      .map((line) => `<li>${line.replace(/^\d+\. /, '')}</li>`)
      .join('');
    return `<ol class="doc-list doc-ol">${items}</ol>`;
  });

  // Task lists (checkboxes)
  html = html.replace(
    /<li>\[x\] (.+)<\/li>/gi,
    '<li class="task-item task-done"><span class="checkbox checked">✓</span> $1</li>'
  );
  html = html.replace(
    /<li>\[ \] (.+)<\/li>/g,
    '<li class="task-item"><span class="checkbox">○</span> $1</li>'
  );

  // Badges / shields.io (common in READMEs)
  html = html.replace(
    /<img src="https:\/\/img\.shields\.io[^"]*" alt="([^"]*)"[^/]*\/>/g,
    '<img src="$&" alt="$1" class="doc-badge" />'
  );

  // Paragraphs (wrap isolated text blocks)
  html = html
    .split('\n\n')
    .map((block) => {
      block = block.trim();
      if (!block) return '';
      if (
        block.startsWith('<h') ||
        block.startsWith('<ul') ||
        block.startsWith('<ol') ||
        block.startsWith('<pre') ||
        block.startsWith('<blockquote') ||
        block.startsWith('<table') ||
        block.startsWith('<div') ||
        block.startsWith('<hr') ||
        block.startsWith('<img') ||
        block.startsWith('\x00CODE')
      ) {
        return block;
      }
      // Convert single newlines to <br> within paragraph
      return `<p class="doc-para">${block.replace(/\n/g, '<br />')}</p>`;
    })
    .join('\n');

  // Restore code blocks
  codeBlocks.forEach((code, idx) => {
    html = html.replace(`\x00CODE${idx}\x00`, code);
  });

  return { html, toc };
}

export function extractTitle(markdown) {
  const match = markdown.match(/^#\s+(.+)$/m);
  return match ? match[1].trim() : null;
}

export function countWords(text) {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

export function readTimeMinutes(wordCount) {
  return Math.max(1, Math.ceil(wordCount / 200));
}
