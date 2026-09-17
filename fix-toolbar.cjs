const fs = require('fs');

const toolbarPath = 'src/components/MovieLibraryToolbar.tsx';
let content = fs.readFileSync(toolbarPath, 'utf-8');

if (!content.includes('{props.titleExtras}')) {
    content = content.replace(
        "    </section>",
        "      {props.titleExtras}\n    </section>"
    );
    fs.writeFileSync(toolbarPath, content, 'utf-8');
    console.log("titleExtras added to Toolbar");
} else {
    console.log("titleExtras already in Toolbar");
}

