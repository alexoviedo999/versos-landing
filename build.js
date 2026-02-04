const { google } = require('googleapis');
const fs = require('fs');
const path = require('path');

// Load configuration
const config = require('./config.json');

// Load OAuth token
const tokenPath = path.join(__dirname, config.google.tokenFile);
const tokens = JSON.parse(fs.readFileSync(tokenPath, 'utf8'));

// Create OAuth2 client
const oauth2Client = new google.auth.OAuth2(
  config.google.oauth.clientId,
  config.google.oauth.clientSecret,
  config.google.oauth.redirectUri
);

oauth2Client.setCredentials(tokens);

// Handle token refresh
oauth2Client.on('tokens', (newTokens) => {
  if (newTokens.refresh_token) {
    tokens.refresh_token = newTokens.refresh_token;
    fs.writeFileSync(tokenPath, JSON.stringify(tokens, null, 2));
  }
});

const drive = google.drive({ version: 'v3', auth: oauth2Client });

async function fetchPoems() {
  console.log('Fetching poems from Google Drive...');

  const response = await drive.files.list({
    q: `mimeType = 'text/markdown' and '${config.google.rootFolderId}' in parents and trashed = false`,
    fields: 'files(id, name, createdTime, size)',
    orderBy: 'createdTime desc',
    pageSize: 50
  });

  const files = response.data.files || [];
  console.log(`Found ${files.length} markdown files`);

  const poems = [];

  for (const file of files) {
    const fileResponse = await drive.files.get({
      fileId: file.id,
      alt: 'media'
    });

    const content = fileResponse.data;

    // Parse YAML frontmatter from Markdown
    const { title, book, language } = parseFrontmatter(content);
    const body = extractPoemBody(content);

    poems.push({
      id: file.id,
      title: title || file.name.replace('.md', ''),
      book: book || 'Unknown',
      body: body,
      language: language || 'es',
      created: new Date(file.createdTime)
    });
  }

  return poems;
}

function parseFrontmatter(content) {
  const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---/);
  if (!frontmatterMatch) {
    return { title: null, book: null, language: null };
  }

  const frontmatter = frontmatterMatch[1];
  const lines = frontmatter.split('\n');

  const result = { title: null, book: null, language: null };

  for (const line of lines) {
    const titleMatch = line.match(/title:\s*"([^"]+)"/);
    const bookMatch = line.match(/book:\s*"([^"]+)"/);
    const langMatch = line.match(/language:\s*"([^"]+)"/);

    if (titleMatch) result.title = titleMatch[1];
    if (bookMatch) result.book = bookMatch[1];
    if (langMatch) result.language = langMatch[1];
  }

  return result;
}

function extractPoemBody(content) {
  const withoutFrontmatter = content.replace(/^---\n[\s\S]*?\n---\n/, '');
  const firstStanza = withoutFrontmatter.split('\n\n')[0];
  return firstStanza || withoutFrontmatter.substring(0, 200) + '...';
}

async function generateHTML(poems) {
  console.log('Generating HTML...');

  const cardsHTML = poems.map((poem, index) => `
            <article class="poem-card">
                <div class="poem-meta">${poem.book}</div>
                <h2 class="poem-title">${escapeHTML(poem.title)}</h2>
                <p class="poem-body">${escapeHTML(poem.body)}</p>
                <a href="https://drive.google.com/file/d/${poem.id}/view" target="_blank" rel="noopener" class="read-more">Read full poem →</a>
            </article>
  `).join('\n');

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Versos - Poetry Collection</title>
    <meta name="description" content="A collection of Spanish poetry from handwritten notebooks">
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,500;0,600;1,400;1,500&family=Inter:wght@300;400;500&display=swap" rel="stylesheet">
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        :root {
            --bg-color: #faf9f7;
            --text-color: #2c2c2c;
            --accent-color: #8b7355;
            --accent-light: #d4c5b5;
            --secondary-text: #6b6b6b;
            --card-bg: #ffffff;
            --card-shadow: 0 4px 20px rgba(0,0,0,0.04);
        }

        @media (prefers-color-scheme: dark) {
            :root {
                --bg-color: #1a1a1a;
                --text-color: #f5f5f5;
                --accent-color: #c9b896;
                --accent-light: #8b7355;
                --secondary-text: #a0a0a0;
                --card-bg: #242424;
                --card-shadow: 0 4px 20px rgba(0,0,0,0.3);
            }
        }

        body {
            font-family: 'Inter', sans-serif;
            background-color: var(--bg-color);
            color: var(--text-color);
            line-height: 1.7;
            min-height: 100vh;
        }

        .container {
            max-width: 900px;
            margin: 0 auto;
            padding: 0 2rem;
        }

        header {
            padding: 4rem 0;
            text-align: center;
        }

        .logo {
            font-family: 'Cormorant Garamond', serif;
            font-size: 3rem;
            font-weight: 300;
            color: var(--text-color);
            letter-spacing: 0.1em;
            margin-bottom: 1rem;
        }

        .tagline {
            color: var(--secondary-text);
            font-size: 1rem;
            font-weight: 300;
            letter-spacing: 0.05em;
        }

        .stats {
            text-align: center;
            margin: 2rem 0;
            color: var(--secondary-text);
            font-size: 0.9rem;
        }

        .poem-grid {
            display: grid;
            gap: 3rem;
            padding: 2rem 0 6rem;
        }

        .poem-card {
            background: var(--card-bg);
            border-radius: 8px;
            padding: 3rem;
            box-shadow: var(--card-shadow);
            transition: transform 0.3s ease, box-shadow 0.3s ease;
            position: relative;
        }

        .poem-card:hover {
            transform: translateY(-4px);
            box-shadow: 0 8px 30px rgba(0,0,0,0.08);
        }

        @media (prefers-color-scheme: dark) {
            .poem-card:hover {
                box-shadow: 0 8px 30px rgba(0,0,0,0.4);
            }
        }

        .poem-meta {
            font-size: 0.85rem;
            color: var(--accent-color);
            text-transform: uppercase;
            letter-spacing: 0.15em;
            margin-bottom: 1.5rem;
            font-weight: 500;
        }

        .poem-title {
            font-family: 'Cormorant Garamond', serif;
            font-size: 2rem;
            font-weight: 400;
            margin-bottom: 1.5rem;
            color: var(--text-color);
        }

        .poem-body {
            font-family: 'Cormorant Garamond', serif;
            font-size: 1.25rem;
            line-height: 1.9;
            color: var(--text-color);
            white-space: pre-line;
            margin-bottom: 2rem;
        }

        .read-more {
            color: var(--accent-color);
            text-decoration: none;
            font-size: 0.9rem;
            font-weight: 500;
            transition: opacity 0.2s ease;
        }

        .read-more:hover {
            opacity: 0.7;
            text-decoration: underline;
        }

        footer {
            text-align: center;
            padding: 3rem 0;
            color: var(--secondary-text);
            font-size: 0.9rem;
        }

        @media (max-width: 640px) {
            .logo {
                font-size: 2.2rem;
            }

            .poem-card {
                padding: 2rem;
            }

            .poem-title {
                font-size: 1.6rem;
            }

            .poem-body {
                font-size: 1.1rem;
            }
        }
    </style>
</head>
<body>
    <div class="container">
        <header>
            <h1 class="logo">Versos</h1>
            <p class="tagline">A collection of Spanish poetry</p>
            <p class="stats">${poems.length} poems from Google Drive</p>
        </header>

        <main class="poem-grid">
            ${cardsHTML}
        </main>

        <footer>
            <p>Synced from Google Drive &middot; <em>Versos</em> &copy; ${new Date().getFullYear()}</p>
        </footer>
    </div>
</body>
</html>`;

  return html;
}

function escapeHTML(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

async function main() {
  try {
    const poems = await fetchPoems();
    const html = await generateHTML(poems);

    fs.writeFileSync(path.join(__dirname, 'index.html'), html);
    console.log(`✓ Generated index.html with ${poems.length} poems`);
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

main();
