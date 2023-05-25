const express = require('express');
const path = require('path');
const fs = require('fs');
const db = require('./mongoDBApi')

var files1 = "";

function str(inputPath) {
  // Replace "D:\Projects\hymnalsite\hymnalfiles\public" with an empty string
  let outputPath = inputPath.replace("D:\\Projects\\hymnalsite\\hymnalfiles\\public", "");

  // Replace backslashes ("\") with forward slashes ("/")
  outputPath = outputPath.replace(/\\/g, "/");
  console.log(outputPath)
  return outputPath;
}

async function logAllFiles(directory) {
  const files = fs.readdirSync(directory);
  
  files.forEach(file => {
    const filePath = path.join(directory, file);
    const stats = fs.statSync(filePath);
    
    if (stats.isDirectory()) {
      logAllFiles(filePath); // Recursively log files in subdirectories
    } else {
      console.log(filePath);
      files1 += `,"${str(filePath)}"`;
    }
  });
}

// Usage:
const rootDirectory = path.join(__dirname,"public");
async function ht(){
  await logAllFiles(rootDirectory);
  await db.createListing({"files":files1},"newHymnal","variables")
}


const app = express();

// Serve all files in the "public" folder
app.use(express.static(path.join(__dirname, 'public')));

app.listen(3300, () => {
  console.log('Server connected at port 3300');
});
