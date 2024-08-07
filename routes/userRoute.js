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


let allbooks = db.readRows({},"books","books") || [{
  base64Image:"",
  bookName:"default",
  author: "default",
  link: "example.com"
}];

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

user_route.get('/engSongs', async (req, res)=>{
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

user_route.get("/oneSong/:table/:number", async(req, res)=>{
  try{
    console.log(`${req.params.number} ${req.params.table}`)
    var engSongs = await db.readRow({number:`${req.params.number}`},"lugandaHymnal",`${req.params.table}`);
    if(engSongs.error){
        res.json({data:"Didn't get song"});
    } else {
        res.json({data:engSongs.listing});
    }
  }
  catch (error){
      res.json({data:error.message})
  }
})

user_route.get("/addBook",(req, res)=>{
  try {
    res.render("addBook",{base64Image:"iVBORw0KGgoAAAANSUhEUgAAABgAAAAYCAYAAADgdz34AAAABHNCSVQICAgIfAhkiAAAAAlwSFlzAAAApgAAAKYB3X3/OAAAABl0RVh0U29mdHdhcmUAd3d3Lmlua3NjYXBlLm9yZ5vuPBoAAANCSURBVEiJtZZPbBtFFMZ/M7ubXdtdb1xSFyeilBapySVU8h8OoFaooFSqiihIVIpQBKci6KEg9Q6H9kovIHoCIVQJJCKE1ENFjnAgcaSGC6rEnxBwA04Tx43t2FnvDAfjkNibxgHxnWb2e/u992bee7tCa00YFsffekFY+nUzFtjW0LrvjRXrCDIAaPLlW0nHL0SsZtVoaF98mLrx3pdhOqLtYPHChahZcYYO7KvPFxvRl5XPp1sN3adWiD1ZAqD6XYK1b/dvE5IWryTt2udLFedwc1+9kLp+vbbpoDh+6TklxBeAi9TL0taeWpdmZzQDry0AcO+jQ12RyohqqoYoo8RDwJrU+qXkjWtfi8Xxt58BdQuwQs9qC/afLwCw8tnQbqYAPsgxE1S6F3EAIXux2oQFKm0ihMsOF71dHYx+f3NND68ghCu1YIoePPQN1pGRABkJ6Bus96CutRZMydTl+TvuiRW1m3n0eDl0vRPcEysqdXn+jsQPsrHMquGeXEaY4Yk4wxWcY5V/9scqOMOVUFthatyTy8QyqwZ+kDURKoMWxNKr2EeqVKcTNOajqKoBgOE28U4tdQl5p5bwCw7BWquaZSzAPlwjlithJtp3pTImSqQRrb2Z8PHGigD4RZuNX6JYj6wj7O4TFLbCO/Mn/m8R+h6rYSUb3ekokRY6f/YukArN979jcW+V/S8g0eT/N3VN3kTqWbQ428m9/8k0P/1aIhF36PccEl6EhOcAUCrXKZXXWS3XKd2vc/TRBG9O5ELC17MmWubD2nKhUKZa26Ba2+D3P+4/MNCFwg59oWVeYhkzgN/JDR8deKBoD7Y+ljEjGZ0sosXVTvbc6RHirr2reNy1OXd6pJsQ+gqjk8VWFYmHrwBzW/n+uMPFiRwHB2I7ih8ciHFxIkd/3Omk5tCDV1t+2nNu5sxxpDFNx+huNhVT3/zMDz8usXC3ddaHBj1GHj/As08fwTS7Kt1HBTmyN29vdwAw+/wbwLVOJ3uAD1wi/dUH7Qei66PfyuRj4Ik9is+hglfbkbfR3cnZm7chlUWLdwmprtCohX4HUtlOcQjLYCu+fzGJH2QRKvP3UNz8bWk1qMxjGTOMThZ3kvgLI5AzFfo379UAAAAASUVORK5CYII="})
  } catch (error) {
    res.send(error.message)
  }
})

user_route.get("/books", async (req, res)=>{
  try {
    if(allbooks.hasOwnProperty("listings")){
      res.render("ebyokuyiga", {books:allbooks.listings});
    }
    else{
      allbooks = await db.readRows({},"books","books");
      res.render("ebyokuyiga", {books:allbooks.listings});
    }
  } catch (error) {
    res.send("There was an error. sorry")
  }
})

user_route.post("/addBook", async(req, res)=>{
  try {
    await db.createListing(req.body,"books","books");
    allbooks = await db.readRows({},"books","books");
    res.redirect("/books");
  } catch (error) {
    res.send("failed");
  }
})

module.exports = user_route;
