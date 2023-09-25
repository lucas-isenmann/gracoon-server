/*
  Script which moves all .md files from src/parameters-info to dist/src/parameters-info
*/

const distDir = __dirname + "/../dist/src/parameters_info"
const directoryPath = __dirname + "/parameters_info"; 


const fs = require('fs');
// const marked = require('marked');
const path = require('path');



console.log("+-----------------------------------+");
console.log("| Build parameters info .html files |");
console.log("+-----------------------------------+");

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

const mdFiles = fs.readdirSync(directoryPath).filter(file => path.extname(file) === '.md');

// Convert each .md file to HTML
// mdFiles.forEach(mdFile => {
//   console.log(mdFile);
//   const mdFilePath = path.join(directoryPath, mdFile);
//   const htmlContent = convertMarkdownToHtml(mdFilePath);
//   const htmlFilePath = path.join(distDir, `${path.basename(mdFile, '.md')}.html`);
//   fs.writeFileSync(htmlFilePath, htmlContent);
// });

// Copy files 
mdFiles.forEach(mdFile => {
  const sourceFile = path.join(directoryPath, mdFile);
  const destinationFile = path.join(distDir, mdFile);

  fs.copyFile(sourceFile, destinationFile, (err) => {
    if (err) {
      console.error(`Failed to move file ${sourceFile}`);
      console.error(err);
    } else {
      console.log("+ ",  mdFile, " copied" )
    }
  });
})
