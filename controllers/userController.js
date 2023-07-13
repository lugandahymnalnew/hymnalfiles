const db = require('../modules/mongoDBApi');
const uploadToFTP = require('../modules/ftp');
const bcrypt = require('bcrypt');

const register = async (req, res)=>{
    console.log(req.body)
    try {
        req.body.password = await bcrypt.hash(req.body.password, 10);
        await uploadToFTP(req, res);
        var checkUser = await db.readRow({$or:[{"userName":req.body.userName},{"email":req.body.email}]},"newHymnal","users");
        if(checkUser.found){
            if(checkUser.listing.email == req.body.email && checkUser.listing.userName == req.body.userName){
                console.log('You are already rigistered hit login')
            }
            else if(checkUser.listing.email == req.body.email){
                console.log('Email already taken');
            }
            else{
                console.log("user name already taken");
            }
        }
        else{
            await db.createListing(req.body,"newHymnal",'users');
        }
    } catch (error) {
        console.log(error.message)
    }
    console.log('yes');
}
const registerLoad = async(req, res)=>{
    
}

module.exports = {
    register,
    registerLoad
}