const express = require("express");
const mongo = require("mongoose");
const session = require('express-session');
const dbConfiguration = require("./setup/config");
const ejs = require("ejs");
const port = process.env.PORT || 5500;
const host = "127.0.0.1";

// Import Tables !
const User = require("./tables/User");
const Seller = require("./tables/Seller");
const Product = require("./tables/Products");

// Include Order Matching Algorithm 
const createOrderBook_result = require("./utils/ordermatch");
const { request } = require("express");
const Products = require("./tables/Products");

// Connect our Mongo DB Database !
mongo.connect(dbConfiguration.url) //Why using then-catch, to avoid code crash and
    .then(()=>{ //If successfully resolved !
        console.log("Database Successfully connected !");
    })
    .catch(err=>{  //If any error occurs !
        console.log("Error: error in connecting with database !",err);
    });

// Initialising express app
let app = express();

// Middlewares
app.use(express.json());
app.use(express.urlencoded({extended: false}));

app.set("view engine","ejs");

app.set('trust proxy', 1) // trust first proxy
app.use(session({
  name : "user",
  secret: 'keyboard cat',
  resave: false,
  saveUninitialized: true,
  cookie: { secure: false,httpOnly: true,path:"/" }
}))

// Protected Functions !

function unauthenticated(request,response,next){
    console.log(request.session);

    if(request.session.email != undefined){
        next();
    }else{
        response.redirect("/login");
    }
}

function authenticated(request,response,next){
    if(request.session.email){
        response.redirect("/");
    }else{
       next(); 
    }
}


// Create Seller Data
let askData = [{
    sellerName : "John",
    name : "shoe",
    price : 120,
    quantity : 10
},{
    sellerName : "Bob",
    name : "bag",
    price : 200,
    quantity : 5
},{
    sellerName : "Alice",
    name : "soap",
    price : 500,
    quantity : 50
}];

// Create Partial Data Array !
let partialData = [];

// Routes
// type - GET
// route - /home
// ip:port/home
// app.use("/",express.static(__dirname + "/client"));

app.get("/",(request,response)=>{

    let sessionStatus = false;

    if(request.session.email != undefined) sessionStatus = true;

    response.render("index",{sessionStatus});
})

app.get("/register",authenticated,(request,response)=>{
    console.log(request.session);
    response.render("register");
});


app.get("/login",authenticated,(request,response)=>{
    response.render("login");
});

app.post("/register",(request,response)=>{
    console.log(request.body);

    const {name, email, password} = request.body;

    // Query Database

    User.findOne({email : email})
        .then((person)=>{
            if(person){
                // If email already exists !, our email matches with any mail in the document 
                response.status(503).json({
                    "message" : "Email ID already registered"
                })
            }else{
                // This is our first time user, so save his/her data !
                // @TODO - ADD TIMESTAMP
                let userObj = {
                    name : name,
                    email : email,
                    password : password
                }

                new User(userObj).save()
                    .then((user)=>{
                        console.log("User registered successfully !");

                        request.session.user_name = user.name;
                        request.session.email = user.email;
                        request.session.password = user.password;

                        console.log("Session: ");
                        console.log(request.session);

                        response.status(200).redirect("/");

                        // response.status(200).json({
                        //     message : "Registered Successfully"
                        // });
                    })
                    .catch(err=>console.log("Error: ",err));
            }
        })
        .catch(err=>console.log("Error: ",err));


})

app.post("/login",(request,response)=>{
    console.log(request.body);

    const {email,password} = request.body;

    // Query Database

    User.findOne({email : email})
        .then((person)=>{
            if(person){
                // Match password 
                if(password === person.password){

                    request.session.user_name = person.name;
                    request.session.email = person.email;
                    request.session.password = person.password;

                    console.log("Session: ");
                    console.log(request.session);

                    response.status(200).redirect("/");

                    // response.status(200).json({
                    //     message : "success"
                    // })
                }else{
                    response.status(200).json({
                        message : "Password not matched !"
                    })
                }
            }else{
                response.status(503).json({
                    message : "Email not registered"
                })
            }
        })
        .catch(err=>console.log("Error: ",err));


})

app.post("/askData",(request,response)=>{
    let {ProductName, ProductPrice, ProductQuantity} = request.body;
    ProductName = ProductName.toLowerCase();
    ProductPrice = Number(ProductPrice);
    ProductQuantity = Number(ProductQuantity);

    if(ProductName != "" && ProductPrice != "" && ProductQuantity != ""){
        // Add products in seller data !
        // Step-1 : Will check for product name uniqueness
        // Step-2 : Add user as a seller in seller table
        // Step-3 : Store same product in products table simultaneously!
        Products.findOne({productName : ProductName})
            .then((product)=>{
                if(product){
                    response.status(503).json({
                        message : "Product already exists !"
                    })
                }else{
                    // Check whether user is first time seller or not !
                    Seller.findOne({email : request.session.email})
                        .then((seller)=>{
                            if(seller){
                                // Update his/her products !
                                Seller.updateOne({
                                    email : request.session.email
                                },{
                                    $push : {
                                        products : {ProductName,ProductPrice,ProductQuantity}
                                    }
                                },{
                                    $new : true
                                })
                                .then(()=>{
                                    let productObject = {
                                        seller_name : request.session.user_name,
                                        email : request.session.email,
                                        productName : ProductName,
                                        productPrice : ProductPrice,
                                        productQuantity : ProductQuantity
                                    }

                                    new Product(productObject).save()
                                        .then(()=>{
                                            response.status(200).json({
                                                message : "Success ✔"
                                            })
                                        })
                                        .catch(err=>console.log("Error: ",err));
                                })
                                .catch(err=>console.log("Error: ",err));
                            }else{
                                // Create new Document for seller

                                const newSellerObject = {
                                    seller_name : request.session.user_name,
                                    email : request.session.email,
                                    products : [{ProductName,ProductPrice,ProductQuantity}]
                                }

                                new Seller(newSellerObject).save()
                                    .then(()=>{

                                        let productObject = {
                                            seller_name : request.session.user_name,
                                            email : request.session.email,
                                            productName : ProductName,
                                            productPrice : ProductPrice,
                                            productQuantity : ProductQuantity
                                        }

                                        new Product(productObject).save()
                                            .then(()=>{
                                                response.status(200).json({
                                                    message : "Success ✔"
                                                })
                                            })
                                            .catch(err=>console.log("Error: ",err));

                                    })
                                    .catch(err=>console.log("Error: ",err));
                            }
                        })
                        .catch(err=>console.log("Error: ",err));
                }
            })
            .catch(err=>console.log("Error: ",err));
    }else{
        response.status(503).json({
            message : "Values Missing !!!"
        })
    }
});

// type - POST
// route - /process
app.post("/process",(request,response)=>{

    if(request.session.email != undefined){
        console.log(request.body);

    // Declare variables for each product parameter !
    
    let productName = request.body.name.toLowerCase();
    let bidPrice = request.body.price;
    let bidQuantity = request.body.quantity;

    console.log("Product Name:",productName);
    console.log("Price: ",bidPrice);
    console.log("Quantity: ",bidQuantity);

    // Product Existence Check
    const productIndex = askData.findIndex((product)=> product.name === productName);

    console.log("Index of the Product: ",productIndex);

    // If product doesn't exists, not found response !
    if(productIndex === -1){
        response.status(404).json({
            "message" : "Product Not Found !"
        });
    }else{

        console.log("Seller's Array: ");
        console.log(askData);

        console.log("Partial Array: ");
        console.log(partialData);


        // Bid against seller's product !
        // createOrderBook_result(order_name,askPrice,askQuantity,bidPrice,bidQuantity)

        // First Case : 2 orders, perfectly matched !
        // Second Case : 2 orders, partial matched!
        // createOrderBook_result(order_name,askPrice,askQuantity,bidPrice,bidQuantity,partialPrice,partialQuantity)

        let partialPrice = 0;
        let partialQuantity = 0;

        // Delete partial order if exists !
        if(partialData.length != 0){
            partialPrice = partialData[0].price;
            partialQuantity = partialData[0].quantity;

            // Delete Partial Data array !
            partialData.splice(0,1);
        }

        console.log("Partial Price: ",partialPrice);
        console.log("Partial Quantity: ",partialQuantity);

        let newValuesObj = createOrderBook_result(productName,Number(askData[productIndex].price),Number(askData[productIndex].quantity),Number(bidPrice),Number(bidQuantity),Number(partialPrice),Number(partialQuantity));

        if(newValuesObj === -1){
            response.status(503).json({
                message : "Order is invalid...try later !"
            })
        }else{  //When order matches or partially matches !
            console.log("New Value Object Generated: ");
            console.log(newValuesObj);

            // Update Ask price if needed !
            if(askData[productIndex].price != newValuesObj.price){
                askData[productIndex].price = newValuesObj.price; //Updated values of price !
            }

            // Update quantity 
            console.log("Ask Quantity: ",askData[productIndex].quantity);
            console.log("New Object Quantity: ",newValuesObj.quantity);
            if(askData[productIndex].quantity != newValuesObj.quantity){

                console.log("Ready for partial Data !");
                //Update quantity, insert partially matched item in partialData array !
                askData[productIndex].quantity = newValuesObj.quantity; //Updated values of quantity !

                if(newValuesObj.order_status === "Order is Partially Completed"){
                    // Partial Data !
                    let partialItemObject = {
                        sellerName : askData[productIndex].sellerName,
                        name : newValuesObj.name,
                        price : newValuesObj.partialPrice,
                        quantity : newValuesObj.partialQuantity
                    }

                    partialData.push(partialItemObject);
                }


            }

            console.log("Seller's Array: ");
            console.log(askData);
    
            console.log("Partial Array: ");
            console.log(partialData);
    
            response.send(newValuesObj.order_status);
        }


    }
    }else{
        response.status(200).redirect("/login");
    }

    
})

app.get("/sellerdashboard",unauthenticated,(request,response)=>{
    response.render("sellerdashboard");
});

app.get("/logout",unauthenticated,(request,response)=>{
    request.session.destroy(function(err) {
        // cannot access session here
        response.redirect("/login")
      });
})

// Listening to port and host (Basically kicks on the server)
app.listen(port,host,()=>{
    console.log("Server is running....");
})
