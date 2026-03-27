import {processHtmlFile} from './html-asset-inliner';
import * as fs from 'fs';

const html = `<!DOCTYPE html>
<html>
<head>
    <script src="https://cdn.tailwindcss.com"></script>
</head>
<body>
<h1 class="text-xl text-blue-500">Hello World</h1>
<img src="https://images.pexels.com/photos/30074262/pexels-photo-30074262.jpeg?auto=compress&cs=tinysrgb&w=100" alt="test"/>
</body>
</html>`
processHtmlFile(html, {
  baseDir: './',
}).then(result => {
  // Write to inlined-html.html for testing
  fs.writeFileSync('inlined-html.html', result.html, 'utf8');


}).catch(err => {
  console.error('Error processing HTML:', err);
}); 