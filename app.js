const express = require('express');
const path = require('path');
const fs = require('fs');
const db = require('./mongoDBApi');
const cors = require('cors');
const fetch = require('node-fetch');
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

app.use(cors({
  origin: "https://hiweightechsystemsltd.onrender.com",
  methods: "*",
  allowedHeaders:"*"
}));

function executeTaskEvery10Minutes() {
  // Task to execute
  console.log("Executing task...");

  function performFetch() {
    fetch("https://hiweightechsystemsltd.onrender.com/keepAlive")
      .then(response => {
        if (!response.ok) {
          throw new Error('Network response was not ok');
        }
        return response.json();
      })
      .then(responseData => {
        // Process the response data
        console.log(responseData);
      })
      .catch(error => {
        // Handle any errors gracefully
        console.log('Error:', error);
        // Take alternative actions or provide appropriate feedback
      })
      .finally(() => {
        // Call the function again after 10 minutes, regardless of success or error
        setTimeout(performFetch, 600000);
      });
  }

  // Initial fetch request
  performFetch();
}

// Call the function to start executing the task every 10 minutes
executeTaskEvery10Minutes();


app.get('/keepAlive', (req, res)=>{
  console.log('Status checked, clear');
  res.send("hlo");
})

// Serve all files in the "public" folder
app.use(express.static(path.join(__dirname, 'public')));

app.listen(3300, () => {
  console.log('Server connected at port 3300');
});
