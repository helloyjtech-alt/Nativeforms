const fs = require('fs');
const path = require('path');
const mammoth = require('mammoth');

const docsDir = 'c:\\Users\\AddizTech\\Desktop\\Emma\'s Data\\custom_form_builder_plan';
const outputDir = __dirname;

const files = fs.readdirSync(docsDir).filter(f => f.endsWith('.docx'));

async function processFiles() {
  for (const file of files) {
    const filePath = path.join(docsDir, file);
    console.log(`Processing ${file}...`);
    try {
      const result = await mammoth.extractRawText({path: filePath});
      fs.writeFileSync(path.join(outputDir, file.replace('.docx', '.txt')), result.value);
      console.log(`Successfully extracted ${file}`);
    } catch (err) {
      console.error(`Failed to extract ${file}:`, err);
    }
  }
}

processFiles();
