const nodemailer = require("nodemailer");
const env = require("dotenv").config();
console.log(env);
console.log("Email from mail.js : ", process.env.EMAIL);
console.log("Password from mail.js : ",process.env.PASSWORD);

// Initialis !
const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
        user: process.env.EMAIL,
        pass: process.env.PASSWORD
    }
});

// Mail Body
const buyerMail = (email,subject,body,cb) => {
    const mailOptions = {
        to: email, // This is to be allowed by GMAIL
        from: 'Online Marketplace',
        subject: subject,
        text: body
    };


    // Send Mail
    transporter.sendMail(mailOptions, (err, data) => {
        console.log("Sending....");
        if (err) {
            console.log("Error from nodemailer or gmail might be !", err)
            cb(err, null);
        } else {
            console.log("Success ! Mail has been sent successfully from nodemailer !");
            cb(null, data);
        }
    });
}


const partialMail = (email,body,cb) => {
    const mailOptions = {
        to: email, // This is to be allowed by GMAIL
        from: 'Online Marketplace',
        subject: "Online Marketplace: Your Order is about to get completed !",
        text: body
    };


    // Send Mail
    transporter.sendMail(mailOptions, (err, data) => {
        console.log("Sending....");
        if (err) {
            console.log("Error from nodemailer or gmail might be !", err)
            cb(err, null);
        } else {
            console.log("Success ! Mail has been sent successfully from nodemailer !");
            cb(null, data);
        }
    });
}

module.exports = {buyerMail,partialMail};
