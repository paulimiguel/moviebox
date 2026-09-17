const fs = require('fs');

const newsPagePath = 'src/pages/NewsPage.tsx';
let content = fs.readFileSync(newsPagePath, 'utf-8');

if (!content.includes('const [selectedCandidate, setSelectedCandidate] = useState<any>(null);')) {
    content = content.replace(
        "const [type, setType] = useState<MovieTypeFilter>('all');",
        "const [type, setType] = useState<MovieTypeFilter>('all');\n  const [selectedCandidate, setSelectedCandidate] = useState<any>(null);"
    );
    fs.writeFileSync(newsPagePath, content, 'utf-8');
    console.log("State added to NewsPage");
} else {
    console.log("State already present");
}
