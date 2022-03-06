const express = require("express");
const mongo = require("mongoose");
const session = require('express-session');
const dbConfiguration = require("./setup/config");
const { buyerMail, partialMail } = require("./utils/email");
const ejs = require("ejs");
const port = process.env.PORT || 5500;
const host = "127.0.0.1";

// Import Tables !
const User = require("./tables/User");
const Seller = require("./tables/OrderBook");
const Products = require("./tables/Admin");

// Include Order Matching Algorithm 
const createOrderBook_result = require("./utils/ordermatch");
const { request } = require("express");
// const Products = require("./tables/Admin");

// Connect our Mongo DB Database !
mongo.connect(dbConfiguration.url) //Why using then-catch, to avoid code crash and
    .then(() => { //If successfully resolved !
        console.log("Database Successfully connected !");
    })
    .catch(err => {  //If any error occurs !
        console.log("Error: error in connecting with database !", err);
    });

// Initialising express app
let app = express();

// Middlewares
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

app.set("view engine", "ejs");

app.set('trust proxy', 1) // trust first proxy
app.use(session({
    name: "user",
    secret: 'keyboard cat',
    resave: false,
    saveUninitialized: true,
    cookie: { secure: false, httpOnly: true, path: "/" }
}))

// Protected Functions !

function unauthenticated(request, response, next) {
    console.log(request.session);

    if (request.session.email != undefined || request.session.adminAccess) {
        next();
    } else {
        response.redirect("/login");
    }
}

function authenticated(request, response, next) {
    if (request.session.email) {
        response.redirect("/");
    } else if (request.session.adminAccess) {
        response.redirect("/admin");
    } else {
        next();
    }
}



// Create Partial Data Array !
let partialData = [];

// Routes
// type - GET
// route - /home
// ip:port/home
// app.use("/",express.static(__dirname + "/client"));

app.get("/", (request, response) => {

    let sessionStatus = false;

    if (request.session.email != undefined) sessionStatus = true;

    Products.find()
        .then((products) => {
            response.render("index", { sessionStatus, products });
        })
        .catch(err => console.log("Error: ", err));
})

app.get("/register", authenticated, (request, response) => {
    console.log(request.session);
    response.render("register");
});


app.get("/login", authenticated, (request, response) => {
    response.render("login");
});

app.post("/register", (request, response) => {
    console.log(request.body);

    const { name, email, password } = request.body;

    // Query Database

    User.findOne({ email: email })
        .then((person) => {
            if (person) {
                // If email already exists !, our email matches with any mail in the document 
                response.status(503).json({
                    "message": "Email ID already registered",
                    responseCode: 503
                })
            } else {
                // This is our first time user, so save his/her data !
                // @TODO - ADD TIMESTAMP
                let userObj = {
                    name: name,
                    email: email,
                    password: password,
                    portfolio: []
                }

                new User(userObj).save()
                    .then((user) => {
                        console.log("User registered successfully !");

                        request.session.user_name = user.name;
                        request.session.email = user.email;
                        request.session.password = user.password;

                        console.log("Session: ");
                        console.log(request.session);

                        response.status(200).json({
                            responseCode: 200,
                            access: "user"
                        });
                    })
                    .catch(err => console.log("Error: ", err));
            }
        })
        .catch(err => console.log("Error: ", err));


})

app.post("/login", (request, response) => {
    console.log(request.body);

    const { email, password } = request.body;

    if (email === "admin@onlinemarket" || password === "000") {
        request.session.adminAccess = true;
        response.json({
            responseCode: 200,
            access: "admin"
        })
    } else {

        // Query Database

        User.findOne({ email: email })
            .then((person) => {
                if (person) {
                    // Match password 
                    if (password === person.password) {
                        console.log("Success Entry !");
                        request.session.user_name = person.name;
                        request.session.email = person.email;
                        request.session.password = person.password;

                        console.log("Session: ");
                        console.log(request.session);

                        // response.status(200).redirect("/");

                        response.status(200).json({
                            responseCode: 200,
                            access: "user"
                        })
                    } else {
                        response.status(503).json({
                            responseCode: 503,
                            access: "user"
                        })
                    }
                } else {
                    console.log("Email not registered !");
                    response.status(503).json({
                        responseCode: 503
                    })
                }
            })
            .catch(err => console.log("Error: ", err));

    }

})


// app.get("/bidForm", unauthenticated, (request, response) => {
//     const productId = request.query.productID;

//     response.render("bidform", { productId });
// })

app.get("/placeorder", unauthenticated, (request, response) => {
    const name = request.query.name;
    const type = request.query.type;
    const price = request.query.price;

    response.render("bidform", { type, name, price });
})

app.post("/adminData", (request, response) => {
    let { name, base_price, base_quantity } = request.body;
    name = name.toLowerCase();
    base_price = Number(base_price);
    base_quantity = Number(base_quantity);

    if (name != "" && base_price != "" && base_quantity != "") {
        // Add products in seller data !
        // Step-1 : Will check for product name uniqueness
        // Step-2 : Add user as a seller in seller table
        // Step-3 : Store same product in products table simultaneously!
        Products.findOne({ name: name })
            .then((product) => {
                if (product) {
                    response.status(503).json({
                        message: "Product already exists !"
                    })
                } else {
                    // Create new Document for seller

                    let productObject = {
                        name: name,
                        base_price: base_price,
                        base_quantity: base_quantity
                    }

                    new Products(productObject).save()
                        .then(() => {

                            response.status(200).json({
                                message: "Success ✔"
                            })

                        })
                        .catch(err => console.log("Error: ", err));
                }
            })
            .catch(err => console.log("Error: ", err));
    } else {
        response.status(503).json({
            message: "Values Missing !!!"
        })
    }
});

// Route for order placing in mongodb

// type - POST
// route - /process
// Desc - trade
app.post("/process", (request, response) => {

    if (request.session.email != undefined) {
        console.log(request.body);

        // Declare variables for each product parameter !

        let productID = request.body.id;
        let bidPrice = request.body.price;
        let bidQuantity = request.body.quantity;

        console.log("Product ID:", productID);
        console.log("Price: ", bidPrice);
        console.log("Quantity: ", bidQuantity);

        Product.findOne({ _id: productID })
            .then((product) => {
                console.log("Seller's Product: ");
                console.log(product);

                console.log("Partial Array: ");
                console.log(partialData);

                if (product.productQuantity === 0) {
                    response.status(503).json({
                        message: "Zero quantity error",
                        order: "invalid",
                        responseCode: 503
                    })
                } else {
                    let partialPrice = 0;
                    let partialQuantity = 0;

                    // Delete partial order if exists !
                    if (partialData.length != 0) {
                        partialPrice = partialData[0].price;
                        partialQuantity = partialData[0].quantity;

                        let body = `Congratulations, Your pending order is about to get completed !
                                    Order Details: 
                                    Order Name: ${productName}
                                    Order Price: ${partialData[0].price}
                                    Order Quantity: ${partialData[0].quantity}`

                        // Send Mail to partial User!
                        partialMail(partialData[0].email, body, (err) => {
                            if (err) {
                                console.log("Mail error");
                                //                                 response.status(503).json({
                                //                                     message : `Mail Error`,
                                //                                     order : "complete"
                                //                                     responseCode : 503
                                //                                 })
                            } else {
                                console.log("Your Partial order is about to get completed !");
                                //                                 response.status(200).json({
                                //                                     message : `Mail sent....Partial Order Completed !`,
                                //                                     order : "complete",
                                //                                     responseCode : 200
                                //                                 })
                            }
                        });
                        // Delete Partial Data array !
                        partialData.splice(0, 1);
                    }

                    console.log("Partial Price: ", partialPrice);
                    console.log("Partial Quantity: ", partialQuantity);

                    let newValuesObj = createOrderBook_result(product.productName, Number(product.productPrice), Number(product.productQuantity), Number(bidPrice), Number(bidQuantity), Number(partialPrice), Number(partialQuantity));

                    let updatedPrice, updatedQuantity = product.productQuantity;
                    if (newValuesObj === -1) {
                        response.status(503).json({
                            message: "Order is invalid...try later !",
                            order: "invalid",
                            responseCode: 503
                        })
                    } else {  //When order matches or partially matches !
                        console.log("New Value Object Generated: ");
                        console.log(newValuesObj);

                        // Update Ask price if needed !
                        if (product.productPrice != newValuesObj.price) {
                            updatedPrice = newValuesObj.price; //Updated values of price !
                        }

                        // Update quantity 
                        // console.log("Ask Quantity: ", product.quantity);
                        console.log("New Object Quantity: ", newValuesObj.quantity);
                        if (product.productQuantity != newValuesObj.quantity) {

                            console.log("Ready for partial Data !");
                            //Update quantity, insert partially matched item in partialData array !
                            updatedQuantity = newValuesObj.quantity; //Updated values of quantity !

                            if (newValuesObj.order_status === "Order is Partially Completed") {
                                // Partial Data !
                                let partialItemObject = {
                                    sellerName: product.seller_name,
                                    email: request.session.email,
                                    name: newValuesObj.name,
                                    price: newValuesObj.partialPrice,
                                    quantity: newValuesObj.partialQuantity
                                }

                                partialData.push(partialItemObject);
                            }


                        }

                        // Send a notification to seller and simultaneously update product database !
                        Seller.updateOne(
                            {
                                email: product.email
                            },
                            { $set: { "products.$[elem].productPrice": updatedPrice, "products.$[elem].productQuantity": updatedQuantity } },
                            { arrayFilters: [{ "elem.productName": { $gte: product.productName } }] })
                            .then(() => {

                                // Update Product Database !
                                Product.updateOne(
                                    {
                                        productName: product.productName
                                    },
                                    {
                                        $set: { productPrice: updatedPrice, productQuantity: updatedQuantity }
                                    },
                                    {
                                        $new: true
                                    }
                                )
                                    .then(() => {
                                        let subject = "";
                                        let body = "";
                                        let order = "";
                                        if (newValuesObj.order_code === 200) {

                                            subject = "Online Marketplace: Order Completed";
                                            order = "complete";
                                            body = `Hello ${request.session.user_name}, 
                                                Your Order is Completed !

                                                Product Name: ${product.productName}
                                                Product Price: ${bidPrice}
                                                Product Quantity: ${bidQuantity}`;

                                        } else if (newValuesObj.order_code === 201) {

                                            subject = "Online Marketplace: Order Partially Completed";
                                            order = "partial";
                                            body = `Hello ${request.session.user_name}, 
                                                Your Order is Partially Completed !
            
                                                Product Name: ${product.productName}
                                                Product Price: ${bidPrice}
                                                Product Quantity: ${bidQuantity}
                                                
                                                Wait till your order gets completed, your pending order is
                                                Product Name: ${productName}
                                                Product Price: ${newValuesObj.partialPrice}
                                                Product Quantity: ${newValuesObj.partialQuantity}
                                                `;

                                        }
                                        // Send order notification to buyer !
                                        buyerMail(request.session.email, subject, body, (err) => {
                                            if (err) {
                                                response.status(503).json({
                                                    message: `Mail Error`,
                                                    order: order
                                                })
                                            } else {
                                                response.status(200).json({
                                                    message: `Mail sent ! ${subject}`,
                                                    order: order
                                                })
                                            }
                                        });
                                    })
                                    .catch(err => console.log("Error: ", err));
                            })
                            .catch(err => console.log("Error: ", err));
                    }
                }


            })
            .catch(err => console.log("Error: ", err));


    } else {
        response.status(200).redirect("/login");
    }
})

app.get("/admin", unauthenticated, (request, response) => {

    response.render("admin");

});

app.get("/logout", unauthenticated, (request, response) => {
    request.session.destroy(function (err) {
        // cannot access session here
        response.redirect("/login")
    });
})

// Listening to port and host (Basically kicks on the server)
app.listen(port, host, () => {
    console.log("Server is running....");
})
