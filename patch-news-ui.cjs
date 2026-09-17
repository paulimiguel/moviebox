const fs = require('fs');

const path = 'src/pages/NewsPage.tsx';
let content = fs.readFileSync(path, 'utf-8');

// 1. Poster size (h-16 w-11 -> h-[84px] w-[58px])
// And gap-3 -> gap-4 for the article flex layout maybe? Let's leave gap-3.
content = content.replace(
  'h-16 w-11 shrink-0',
  'h-[84px] w-[58px] shrink-0'
);

// 2. Number white (text-slate-200 opacity-60 -> text-white opacity-100)
// Also maybe a bit larger text? 5xl is already big. Let's make it text-6xl for better emphasis.
content = content.replace(
  'text-5xl tracking-tighter text-slate-200 opacity-60',
  'text-[56px] tracking-tighter text-white opacity-100'
);
// Adjust width of the number container so it doesn't squish (w-12 -> w-16)
content = content.replace(
  'w-12 font-black',
  'w-[52px] font-black'
);

// 3. Platform Icon and Name size
// Icon: h-8 -> h-11
// Name: text-xl -> text-3xl
content = content.replace(
  'h-8 w-auto rounded object-contain',
  'h-11 w-auto rounded object-contain'
);
content = content.replace(
  'font-bebas text-xl text-ink tracking-wide',
  'font-bebas text-[28px] leading-none text-ink tracking-wide'
);
// Just in case it was white and got replaced to ink
content = content.replace(
  'font-bebas text-xl text-white tracking-wide',
  'font-bebas text-[28px] leading-none text-white tracking-wide'
);

// In case it's text-ink (from earlier fixes):
content = content.replace(
  'font-bebas text-xl text-ink tracking-wide',
  'font-bebas text-[28px] leading-none text-ink tracking-wide'
);

fs.writeFileSync(path, content, 'utf-8');
console.log('Patched NewsPage UI tweaks');
