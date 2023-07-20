const db = require('../modules/mongoDBApi');
const uploadToFTP = require('../modules/ftp');
const bcrypt = require('bcrypt');
const fs = require('fs');
// const session = require('express-session');

async function delFiles(req){
    const files = req.files;
    await files.forEach(fil => {
      try {
        fs.unlinkSync(fil.path)
      } catch (err) {
        console.log(err.message)
      }
    });
  }
const loadRegister = async (req, res)=>{
    try {
        res.render('register');
    } catch (error) {
        res.render('error',{error:error.message});
    }
}

const register = async (req, res)=>{
    try {
        // Encrypting password
        req.body.password = await bcrypt.hash(req.body.password, 10);
        // Uploading files in route
        // checking if user exists and adding them if not
        var checkUser = await db.readRow({$or:[{"userName":req.body.userName},{"email":req.body.email}]},"newHymnal","users");
        if(checkUser.found){
            if(checkUser.listing.email == req.body.email && checkUser.listing.userName == req.body.userName){
                console.log('You are already rigistered hit login');
                res.render('register',{message:"You are already rigistered hit login",login:""});
            }
            else if(checkUser.listing.email == req.body.email){
                console.log('Email already taken');
                res.render('register',{message:"Email already taken"});
            }
            else{
                console.log("user name already taken");
                res.render('register',{message:"user name already taken"});
            }
        }
        else{
            console.log(checkUser);
            await uploadToFTP(req, res);
            await db.createListing(req.body,"newHymnal",'users');
            res.render('register',{message:"You have been registered Successfully",login:""});
        }
    } catch (error) {
        console.log(error.message);
        res.render('error',{error:error.message});
    }
}

const loadLogin = async (req, res)=>{
     try {
        res.render('login');
     } catch (error) {
        res.render('error',{error:error.message});
     }
}

const login = async (req, res)=>{
    try {
        var checkUser = await db.readRow({$or:[{"userName":req.body.userName},{"email":req.body.userName}]},"newHymnal","users");
        if(checkUser.found){
            const checkPassword = await bcrypt.compare(req.body.password,checkUser.listing.password);

            if(checkPassword){
                req.session.user = checkUser.listing
                console.log(req.session.user)
                res.redirect('/dashboard');
            }
            else{
                res.render('login',{message:"Invalid Password"});
            }
        }
        else{
            console.log(checkUser);
            res.render('login',{message:"User Name or Email doesn't exist",login:""});
        }
    } catch (error) {
        console.log(error.message);
        res.render('error',{error:error.message});
    }
}

const logout = async (req, res)=>{
     try {
        req.session.destroy();
        res.redirect('/login');
     } catch (error) {
        res.render('error',{message:error.message});
     }
}
const loadDashboard = async (req, res)=>{
    try {
        if(req.session.user){
            res.render('dashboard',{user:req.session.user.fullName});
        }
        else{
            res.render('dashboard');
        }
    } catch (error) {
        res.render('error',{error:error.message})
    }
}

module.exports = {
    register,
    loadLogin,
    login,
    logout,
    loadDashboard
}