const express = require("express");
const mongo = require("mongoose");
const session = require("express-session");
const ejs = require("ejs");
const dbURL = require("./setup/config").url;
const host = '127.0.0.1';
const port = process.env.PORT || 3000;

let app = express();
app.set("view engine", "ejs");
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

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
    }
    else {
        next();
    }
}

// Import Tables 
const Base = require("./tables/Admin");
const User = require("./tables/User");
const Admin = require("./tables/Admin");
const Order = require("./tables/Orderbook");
const Orderbook = require("./tables/Orderbook");


// Database Connection !
mongo.connect(dbURL)
    .then(() => {
        console.log("Database Connected !");
    })
    .catch(err => console.log("Error: ".err));


// Routes
app.get("/", (request, response) => {
    let sessionStatus = false;

    if (request.session.email != undefined || request.session.adminAccess) sessionStatus = true;

    Admin.find()
        .then((assets) => {
            response.render("index", { sessionStatus: sessionStatus, products: assets });
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


});

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
                            responseCode: 503
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

app.get("/admin", unauthenticated, (request, response) => {

    Base.find()
        .then((data) => {
            response.render("admin", { baseData: data });
        })
        .catch(err => console.log("Error: ", err));

});

// /order?type=buy&name=xyz&price=000&quantity
app.get("/order", unauthenticated, (request, response) => {
    const { type, name, price } = request.query;
    console.log(request.query);

    response.render("bidform", { type, name, price });
});

app.post("/place", unauthenticated, (request, response) => {
    console.log(request.body);
    let calculatedQuantity;
    let buyFlag = false;
    let orderObj = {};
    orderObj.type = request.body.type;
    orderObj.name = request.body.name;

    // Differentiate between orders !
    if (request.body.type === "sell") {
        orderObj.quantity = request.body.quantity;
    } else {
        orderObj.price = request.body.price;
    }

    Base.findOne({ name: request.body.name })
        .then((asset) => {
            // Compulsorily for buy orders !
            if (request.body.type === "buy") {
                // Check availability status
                // formula = x = price entered/price of one quantity
                calculatedQuantity = Number(request.body.price) / Number(asset.base_price);
                console.log("Price Entered: ",request.body.price);
                console.log("Calculated Quantity: ",calculatedQuantity);

                if (calculatedQuantity <= asset.base_quantity) {
                    buyFlag = true;
                }
            }

            // Place an order !
            Orderbook.findOne({ name: request.body.name })
                .then((asset) => {
                    if (asset) {
                        if (request.body.type === "sell") {
                            // Sell Order Update Query
                            Orderbook.updateOne({
                                name: request.body.name
                            }, {
                                $push: { sellOrders: { orderObj } }
                            }, {
                                $new: true
                            })
                                .then(() => {
                                    console.log("Order Placed !");
                                    response.json({
                                        message: "placed"
                                    })
                                })
                                .catch("Error: ", err);
                        } else {
                            if (buyFlag) {
                                // Buy Order Update Query
                                Orderbook.updateOne({
                                    name: request.body.name
                                }, {
                                    $push: { buyOrders: { orderObj } }
                                }, {
                                    $new: true
                                })
                                    .then(() => {
                                        console.log("Order Placed !");
                                        response.json({
                                            message: "placed"
                                        })
                                    })
                                    .catch(err => console.log("Error: ", err));
                            } else {
                                response.json({
                                    message: "Quantity Error"
                                })
                            }

                        }
                    } else {
                        console.log(orderObj);

                        if (buyFlag) {
                            new Order(orderObj).save()
                                .then(() => {
                                    console.log("Order placed successfully !");
                                    // Add response !
                                    response.json({
                                        message: "placed"
                                    })
                                })
                                .catch(err => console.log("Error: ", err));
                        } else {
                            response.json({
                                message: "Quantity Error"
                            })
                        }

                    }
                })
                .catch(err => console.log("Error: ", err));

        })
        .catch(err => console.log("Error: ", err));
})


app.post("/basedata", (request, response) => {
    console.log(request.body);

    const { ProductName, ProductPrice, ProductQuantity, ProductAvailability } = request.body;
    let id = Date.now();

    let baseObj = {
        id: id,
        name: ProductName,
        base_price: ProductPrice,
        base_quantity: ProductQuantity,
        availability: ProductAvailability
    };

    new Base(baseObj).save()
        .then(() => {
            console.log("Added successfully !");

            response.json({
                message: "Added"
            })
        })
        .catch(err => console.log("Error: ", err));
})


app.get("/logout", unauthenticated, (request, response) => {
    request.session.destroy(function (err) {
        // cannot access session here
        response.redirect("/login")
    });
})


app.listen(port, host, () => {
    console.log(`Server is running..`);
})
