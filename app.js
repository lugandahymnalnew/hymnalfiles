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

myDB.createTable("users",tblUser);

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
