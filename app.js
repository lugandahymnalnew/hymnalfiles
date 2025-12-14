const express = require('express');
const fetch = require('node-fetch');

const app = express();
const http = require('http').Server(app);


function executeTaskEvery10Minutes() {
  // Task to execute
  function keepChecker(){
  fetch("https://audiorecordingfm.onrender.com/keepAlive")
  .then(response=>{
    if(!response.ok){
      console.log("connection failed - recorder");
    }
      return response;
  }).then(res => {
    console.log("connection clear - recorder")
  }).catch(error => {
    // Handle any errors gracefully
    console.log('Error:', error);
    // Take alternative actions or provide appropriate feedback
  })
  .finally(async () => {
    try {
      const response2 = await fetch('https://payment-gateway-0001.onrender.com/health');
      const response = await fetch('https://darewell-civ1.onrender.com/ping');
      
      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }
      if (!response2.ok){
        throw new Error(`HTTP error! Status: ${response1.status}`);
      }
  
      console.log('Darewell and payment gateway awake');
    } catch (error) {
      console.error('Fetch failed:', error.message);
    }
    // Call the function again after 10 minutes, regardless of success or error
    setTimeout(keepChecker, 600000);
});
}
  function performFetch() {
    fetch("https://hiweightechsystemsltd.onrender.com/keepAlive")
          .then(response => {
            if (!response.ok) {
              console.log('Network response was not ok');
            }
            return response;
          })
      .then(responseData => {
        // Process the response data
        console.log("Response clear");
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

  performFetch();
  keepChecker();
}
  // Initial fetch request


// Call the function to start executing the task every 10 minutes
executeTaskEvery10Minutes();

const userRoute = require('./routes/userRoute');
app.use("/",userRoute);
app.get('/adverts',async (req, res)=>{
  try {
    res.redirect('https://audiorecordingfm.onrender.com/');
  } catch (error) {
    res.render('error',{error:error.message+"\nIts on our side don't worry."});
  }
});


app.get('/emisi',async (req, res)=>{
  try {
    res.redirect('https://audiorecordingfm.onrender.com/');
  } catch (error) {
    res.render('error',{error:error.message+"\nIts on our side don't worry."});
  }
});

app.get('/leson',async (req, res)=>{
  try {
    // res.render("addBook");
    res.redirect("/books");
    // res.redirect('https://audiorecordingfm.onrender.com/');
  } catch (error) {
    res.render('error',{error:error.message+"\nIts on our side don't worry."});
  }
});
// Serve all files in the "public" folder

http.listen(3300, () => {
  console.log('Server connected at port 3300');
});
