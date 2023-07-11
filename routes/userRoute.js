const express = require('express');
const path = require('path');
const cors = require('cors');
const user_route = express();

const bodyParser = require('body-parser');
user_route.use(bodyParser.json());
user_route.use(bodyParser.urlencoded({extended:true}));

user_route.use(cors({
    origin: "https://hiweightechsystemsltd.onrender.com",
    methods: "*",
    allowedHeaders:"*"
}));

user_route.set('view engine','ejs');
user_route.set('views','./views');
user_route.use(express.static(path.join(__dirname, '../public')));

user_route.get('/keepAlive', (req, res)=>{
  console.log('Status checked, clear');
  res.send("hlo");
})

user_route.get('/dashboard', (res, req)=>{
    req.render('dashboard');
});


module.exports = user_route;