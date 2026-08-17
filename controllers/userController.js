const db = require('../modules/mongoDBApi');
const uploadToFTP = require('../modules/ftp');
const bcrypt = require('bcrypt');
const fs = require('fs');
const { signAccessToken, sanitizeUser } = require('../modules/jwtAuth');
const { generateRefreshToken, revokeRefreshToken, revokeAllUserTokens } = require('../modules/refreshToken');
const { createEmailVerificationToken, consumeEmailVerificationToken, createPasswordResetToken, consumePasswordResetToken } = require('../modules/emailTokens');
const mailer = require('../modules/mailer');
const { ObjectId } = require('mongodb');

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
            const profileData = req.body.profileBase64 || '';
            const newUser = {
                fullName: req.body.fullName,
                userName: req.body.userName,
                email: req.body.email,
                passwordHash: passwordHash,
                profile: profileData,
                role: 'user',
                status: 'pending',
                emailVerified: false,
                approvedAt: null,
                approvedBy: null,
                lastLoginAt: null,
                createdAt: new Date(),
                updatedAt: new Date()
            };

            await db.createListing(newUser,"newHymnal",'users');

            // Best-effort: registration should still succeed even if the email fails to send.
            try {
                const createdUser = await db.readRow({ userName: newUser.userName }, "newHymnal", "users");
                if (createdUser && createdUser.found) {
                    const { token } = await createEmailVerificationToken(createdUser.listing._id);
                    await mailer.sendVerificationEmail(createdUser.listing, token);
                }
            } catch (mailError) {
                console.log('Failed to send verification email: ' + mailError.message);
            }

            res.render('register',{message:"Registration successful. Check your email to confirm your address. Your account is also pending admin approval.",login:""});
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
                const refreshTokenResult = await generateRefreshToken(
                    freshUser._id,
                    req.headers['user-agent'] || '',
                    req.ip || req.connection.remoteAddress || ''
                );

                res.json({
                    success: true,
                    message: 'Login successful',
                    accessToken,
                    refreshToken: refreshTokenResult.refreshToken,
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
        const { refreshToken } = req.body;
        if (refreshToken) {
            await revokeRefreshToken(refreshToken);
        }
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

/**
 * =====================
 * EMAIL VERIFICATION
 * =====================
 */

const verifyEmail = async (req, res) => {
    try {
        const { token } = req.query;
        if (!token) {
            return res.render('error', { error: 'Missing verification token.' });
        }

        const result = await consumeEmailVerificationToken(token);
        if (!result.valid) {
            return res.render('error', { error: result.error === 'Token expired'
                ? 'This verification link has expired. Please request a new one from your dashboard.'
                : 'This verification link is invalid or has already been used.' });
        }

        await db.updateRow(
            { _id: new ObjectId(result.userId) },
            { emailVerified: true, updatedAt: new Date() },
            "newHymnal",
            "users"
        );

        res.render('login', { message: 'Email confirmed! You can now sign in.' });
    } catch (error) {
        res.render('error', { error: error.message });
    }
}

const resendVerification = async (req, res) => {
    try {
        const user = req.user;
        if (user.emailVerified) {
            return res.json({ success: false, message: 'Email is already verified.' });
        }

        const { token } = await createEmailVerificationToken(user._id);
        await mailer.sendVerificationEmail(user, token);

        res.json({ success: true, message: 'Verification email sent.' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
}

/**
 * =====================
 * PASSWORD RESET
 * =====================
 */

const forgotPassword = async (req, res) => {
    // Always respond with a generic success message so this endpoint can't be used
    // to enumerate which emails are registered.
    const genericResponse = { success: true, message: 'If an account exists for that email, a reset link has been sent.' };

    try {
        const { email } = req.body;
        if (!email) {
            return res.status(400).json({ success: false, message: 'Email is required' });
        }

        const checkUser = await db.readRow({ email }, "newHymnal", "users");
        if (checkUser && checkUser.found) {
            const { token } = await createPasswordResetToken(checkUser.listing._id);
            await mailer.sendPasswordResetEmail(checkUser.listing, token);
        }

        res.json(genericResponse);
    } catch (error) {
        console.log('forgotPassword error: ' + error.message);
        res.json(genericResponse);
    }
}

const resetPassword = async (req, res) => {
    try {
        const { token, password } = req.body;
        if (!token || !password) {
            return res.status(400).json({ success: false, message: 'Token and new password are required' });
        }
        if (password.length < 8) {
            return res.status(400).json({ success: false, message: 'Password must be at least 8 characters' });
        }

        const result = await consumePasswordResetToken(token);
        if (!result.valid) {
            return res.status(400).json({ success: false, message: result.error === 'Token expired'
                ? 'This reset link has expired. Please request a new one.'
                : 'This reset link is invalid or has already been used.' });
        }

        const passwordHash = await bcrypt.hash(password, 10);
        await db.updateRow(
            { _id: new ObjectId(result.userId) },
            { passwordHash, updatedAt: new Date() },
            "newHymnal",
            "users"
        );

        // Resetting the password invalidates every existing session, forcing re-login everywhere.
        await revokeAllUserTokens(result.userId);

        res.json({ success: true, message: 'Password updated. Please sign in with your new password.' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
}

const loadForgotPassword = async (req, res) => {
    try {
        res.render('forgot-password');
    } catch (error) {
        res.render('error', { error: error.message });
    }
}

const loadResetPassword = async (req, res) => {
    try {
        res.render('reset-password', { token: req.query.token || '' });
    } catch (error) {
        res.render('error', { error: error.message });
    }
}

module.exports = {
    register,
    loadLogin,
    login,
    logout,
    loadDashboard,
    me,
    verifyEmail,
    resendVerification,
    forgotPassword,
    resetPassword,
    loadForgotPassword,
    loadResetPassword
}
