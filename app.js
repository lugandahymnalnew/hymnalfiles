require('dotenv').config();

const express = require('express');
const fetch = require('node-fetch');
const path = require('path');

const app = express();
const http = require('http').Server(app);

// View engine configuration
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));


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
const feedbackApiRoute = require('./routes/feedbackRoute');
const feedbackViewRoute = require('./routes/feedbackViewRoute');
const bibleRoute = require('./routes/bibleRoute');
const db = require('./modules/mongoDBApi');

app.use('/api/bible', bibleRoute);

const SITE_URL = process.env.SITE_URL || 'https://newlugandahymnal.onrender.com';

function xmlEscape(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

app.get('/sitemap.xml', async (req, res) => {
  try {
    const staticUrls = [
      { loc: '/', changefreq: 'weekly', priority: '1.0' },
      { loc: '/src/menu.html', changefreq: 'monthly', priority: '0.8' },
      { loc: '/src/index.html', changefreq: 'monthly', priority: '0.8' },
      { loc: '/books', changefreq: 'weekly', priority: '0.6' }
    ];

    const songs = await db.readRows({}, 'lugandaHymnal', 'luganda');
    const songUrls = (!songs.err && songs.listings ? songs.listings : [])
      .filter((song) => song.number)
      .map((song) => ({
        loc: `/songs.html?song=${encodeURIComponent(song.number)}`,
        changefreq: 'yearly',
        priority: '0.5'
      }));

    const allUrls = [...staticUrls, ...songUrls];

    const body = allUrls
      .map((url) => `  <url>\n    <loc>${xmlEscape(SITE_URL + url.loc)}</loc>\n    <changefreq>${url.changefreq}</changefreq>\n    <priority>${url.priority}</priority>\n  </url>`)
      .join('\n');

    res.set('Content-Type', 'application/xml');
    res.send(`<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${body}\n</urlset>`);
  } catch (error) {
    res.status(500).set('Content-Type', 'application/xml').send('<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"></urlset>');
  }
});

app.use("/",userRoute);
app.use("/api/feedback", feedbackApiRoute);
app.use("/", feedbackViewRoute);
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

const PORT = process.env.PORT || 3300;
http.listen(PORT, () => {
  console.log(`Server connected at port ${PORT}`);
});
