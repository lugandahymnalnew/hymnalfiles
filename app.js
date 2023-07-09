const express = require('express');
const path = require('path');
const fs = require('fs');
const db = require('./mongoDBApi');
const cors = require('cors');
const fetch = require('node-fetch');
const myDB = require('./modules/mySQLApi');

const app = express();
const tblUser = [
  {name: "username",type:"text"},
  {name: "password",type:"text"},
  {name: "email",type:"text"},
  {name: "rights",type:"text"}
]

app.use(cors({
  origin: "https://hiweightechsystemsltd.onrender.com",
  methods: "*",
  allowedHeaders:"*"
}));

function executeTaskEvery10Minutes() {
  // Task to execute
  console.log("Executing task...");

  // Repeat the task every 10 minutes (600,000 milliseconds)
  setInterval(function() {

fetch("https://hiweightechsystemsltd.onrender.com/keepAlive")
  .then(response => console.log(response))
  .then(responseData => {
    // Process the response data
    console.log(responseData);
  })
  .catch(error => {
    // Handle any errors
    console.error('Error:', error);
    return executeTaskEvery10Minutes();
  });
    return executeTaskEvery10Minutes();
    // Add your task logic here
  }, 600000);
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
