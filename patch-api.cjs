const fs = require('fs');

const frontendPath = 'src/services/api.ts';
let content = fs.readFileSync(frontendPath, 'utf-8');

const replacement = `    tmdb: {
      status: () => request<{ configured: boolean; protectedFields: string[] }>('/tmdb/status'),
      suggestions: (query = '') => request<TmdbSuggestionCandidate[]>(\`/tmdb/suggestions\${query ? \`?query=\${encodeURIComponent(query)}\` : ''}\`),
      newReleases: (platform: string) => request<{ movies: any[], series: any[] }>(\`/tmdb/new-releases?platform=\${platform}\`),
      recommendations: (type: 'movie' | 'series', id: number) => request<TmdbSuggestionCandidate[]>(\`/tmdb/recommendations?type=\${type}&id=\${id}\`),
    },`;

content = content.replace(/tmdb: \{[\s\S]*?newReleases:[^\n]*\n\s*\},/, replacement);
fs.writeFileSync(frontendPath, content, 'utf-8');
console.log('API patched');
