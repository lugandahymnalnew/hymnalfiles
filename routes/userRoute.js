const express = require('express');
const path = require('path');
const cors = require('cors');
const multer = require('multer');
const fs = require('fs');
const con = require('./../config.json');
const session = require('express-session');
const db = require("../modules/mongoDBApi");

const user_route = express();

const bodyParser = require('body-parser');
user_route.use(bodyParser.json());
user_route.use(bodyParser.urlencoded({extended:true}));



user_route.use(cors({
    origin: "*",
    methods: "*",
    allowedHeaders:"*"
}));

user_route.use(session({
  secret: con.sessionSecret,
  resave: false,
  saveUninitialized: true,
  cookie: { secure: false } // Note: Change to 'true' if using HTTPS
}));

user_route.set('view engine','ejs');
user_route.set('views','./views');
user_route.use(express.static(path.join(__dirname, '../public')));
user_route.post('/sendSong',async (req, res) => {
  try {
    const receivedData = req.body;
    await db.updateRow2(receivedData, receivedData, 'lugandaHymnal','luganda');
    res.status(200).json({ message: 'JSON data received successfully!' });
  } catch (error) {
    res.status(404).json({ message: error.message });
  }
  
  // Process the receivedData as needed

  // Send a response
});

// const storage = multer.diskStorage({
//   destination:function(req, file, cb){
//     cb(null,'uploads/')
//   },
//   filename:function(req,file,cb){
//     const n = Date.now()+'-'+file.originalname;
//     cb(null,n)
//   }
// });

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = 'uploads/';// 
    fs.mkdirSync(uploadDir, { recursive: true });
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const n = file.originalname;
    cb(null, n);
  }
});



const upload = multer({storage:storage});
const userController = require('../controllers/userController');
const auth = require('./../middleWares/auth');

// handeling registration
user_route.get('/register', auth.isLogin ,(req,res)=>{
  res.render("register");
});
user_route.post('/register',upload.any(), userController.register);

// handling login
user_route.get('/login',auth.isLogin, userController.loadLogin);
user_route.post('/login', userController.login);

// handling logouts
user_route.get('/logout',auth.isLogout, userController.logout)

user_route.get('/dashboard',userController.loadDashboard);

user_route.get('/keepAlive', (req, res)=>{
  console.log('Status checked, clear');
  res.send("hlo");
});

user_route.get('/getBible',async (req, res)=>{
  var list = await db.listTables("bible");
  res.json({tables:list});
})

user_route.get('/getBible/:book',async (req, res)=>{
  try {
    var verses = await db.readRows({},"bible",req.params.book);
    res.json({ver:verses.listings})
  } catch (error) {
    console.log(error.message)
  }
});

user_route.get('/engSongs', async (req, res)={
    try{
        var engSongs = await db.readRows({},"lugandaHymnal","english");
        if(engSongs.error){
            res.json({data:"Didn't get songs"});
        } else {
            res.json({data:engSongs.listings});
        }
    }
    catch (error){
        res.json({data:error.message})
    }
});

module.exports = user_route;
