const fs = require('fs');

const newsPagePath = 'src/pages/NewsPage.tsx';
let content = fs.readFileSync(newsPagePath, 'utf-8');

const badBlock1 = `        titleExtras={
          <div className="mt-4 flex flex-wrap gap-2">
          <div className="mt-4 flex items-center gap-2 overflow-x-auto pb-1 -mb-1 no-scrollbar">`;

const goodBlock1 = `        titleExtras={
          <div className="mt-4 flex items-center gap-2 overflow-x-auto pb-1 -mb-1 no-scrollbar">`;

const badBlock2 = `                  className={\`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors \${
                  className={\`inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold whitespace-nowrap transition-colors \${`;

const goodBlock2 = `                  className={\`inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold whitespace-nowrap transition-colors \${`;

content = content.replace(badBlock1, goodBlock1);
content = content.replace(badBlock1.replace(/\r\n/g, '\n'), goodBlock1.replace(/\r\n/g, '\n'));

content = content.replace(badBlock2, goodBlock2);
content = content.replace(badBlock2.replace(/\r\n/g, '\n'), goodBlock2.replace(/\r\n/g, '\n'));

fs.writeFileSync(newsPagePath, content, 'utf-8');
console.log("NewsPage cleaned");
