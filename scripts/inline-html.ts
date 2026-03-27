import {processHtmlFile} from '../packages/base/server/src/pack/html-asset-inliner';


const html =`
'<html>
<head>
<link rel="stylesheet" href="styles.css">
    <script src="https://cdn.tailwindcss.com"></script>

</head>
<body>
<h1 class="text-xl">Hello World</h1> 
<img src=https://images.pexels.com/photos/30074262/pexels-photo-30074262.jpeg"/>
</body>
</html>'
`
processHtmlFile(html, {
  baseDir: './',
}).then(result => {
  console.log('Processed HTML:', result.html);
}).catch(err => {
  console.error('Error processing HTML:', err);
}); 