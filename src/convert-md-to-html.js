const fs = require('fs');
const marked = require('marked');
const path = require('path');

const distDir = __dirname + "/../dist/src/parameters_info"

console.log("---------------------------------------");
console.log("Build parameters info .html files");
console.log("---------------------------------------");

fs.mkdir(distDir, { recursive: true }, (err) => {
  if (err) {
    console.error(err);
    return;
  }
  console.log('Dist directory created successfully');
});

// Function to convert Markdown to HTML
function convertMarkdownToHtml(filePath) {
  const markdownContent = fs.readFileSync(filePath, 'utf-8');
  const htmlContent = marked.parse(markdownContent);
  return htmlContent;
}

// Get a list of all .md files in the directory
const directoryPath = __dirname + "/parameters_info"; 
console.log(directoryPath);
const mdFiles = fs.readdirSync(directoryPath).filter(file => path.extname(file) === '.md');

// Convert each .md file to HTML
mdFiles.forEach(mdFile => {
  console.log(mdFile);
  const mdFilePath = path.join(directoryPath, mdFile);
  const htmlContent = convertMarkdownToHtml(mdFilePath);
  const htmlFilePath = path.join(distDir, `${path.basename(mdFile, '.md')}.html`);
  fs.writeFileSync(htmlFilePath, htmlContent);
});
