const db = require('../modules/mongoDBApi');
const uploadToFTP = require('../modules/ftp');
const bcrypt = require('bcrypt');
const fs = require('fs');
const { signAccessToken, sanitizeUser } = require('../modules/jwtAuth');

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
        const passwordHash = await bcrypt.hash(req.body.password, 10);
        const checkUser = await db.readRow({$or:[{"userName":req.body.userName},{"email":req.body.email}]},"newHymnal","users");
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
            const profileFile = req.files && req.files[0] ? req.files[0].originalname : '';
            const newUser = {
                fullName: req.body.fullName,
                userName: req.body.userName,
                email: req.body.email,
                passwordHash: passwordHash,
                profile: profileFile,
                role: 'user',
                status: 'pending',
                approvedAt: null,
                approvedBy: null,
                lastLoginAt: null,
                createdAt: new Date(),
                updatedAt: new Date()
            };

            await db.createListing(newUser,"newHymnal",'users');
            res.render('register',{message:"Registration successful. Your account is pending admin approval.",login:""});
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
            const passwordHash = checkUser.listing.passwordHash || checkUser.listing.password;
            const checkPassword = await bcrypt.compare(req.body.password, passwordHash);

            if(checkPassword){
                if ((checkUser.listing.status || 'pending') !== 'approved') {
                    return res.status(403).json({ success: false, message: 'Your account is pending admin approval.' });
                }

                await db.updateRow(
                    { _id: checkUser.listing._id },
                    { lastLoginAt: new Date(), updatedAt: new Date() },
                    "newHymnal",
                    "users"
                );

                const freshUser = {
                    ...checkUser.listing,
                    lastLoginAt: new Date()
                };
                const accessToken = signAccessToken(freshUser);

                res.json({
                    success: true,
                    message: 'Login successful',
                    accessToken,
                    user: sanitizeUser(freshUser)
                });
            }
            else{
                res.status(401).json({ success: false, message: "Invalid password" });
            }
        }
        else{
            console.log(checkUser);
            res.status(404).json({ success: false, message: "User name or email doesn't exist" });
        }
    } catch (error) {
        console.log(error.message);
        res.status(500).json({ success: false, message: error.message });
    }
}

const logout = async (req, res)=>{
     try {
        res.json({ success: true, message: 'Logged out' });
      } catch (error) {
        res.render('error',{message:error.message});
      }
}
const loadDashboard = async (req, res)=>{
    try {
        res.render('dashboard');
    } catch (error) {
        res.render('error',{error:error.message})
    }
}

const me = async (req, res) => {
    try {
        res.json({ success: true, user: req.user });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
}

module.exports = {
    register,
    loadLogin,
    login,
    logout,
    loadDashboard,
    me
}
