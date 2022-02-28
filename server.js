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
const Orderbook = require("./tables/Orderbook");
const trade = require("./utils/ordermatch");


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

// Calculate quantity function 
function calculateQuantity(price,base_price){
    return price / base_price;
}

// Calculate price function
function calculatePrice(base_price,quantity){
    return base_price * quantity;
}

app.post("/place", unauthenticated, (request, response) => {
    console.log(request.body);
    let calculatedQuantity;
    let buyFlag = false;
    let all_orders = [];

    // orderObj = {
    //     name : name,
    //     sellOrders : [{},{},{}],
    //     buyOrders : [{},{},{}]
    // }
    let order_document_object = {};
    let order_object = {};
    order_document_object.name = request.body.name;
    order_document_object.sellOrders = [];
    order_document_object.buyOrders = [];

    // Differentiate between orders !
    if (request.body.type === "sell") {
        order_object.type = request.body.type;
        order_object.quantity = request.body.quantity;

        order_document_object.sellOrders.push(order_object);
    } else {
        order_object.type = request.body.type;
        order_object.price = request.body.price;

        order_document_object.buyOrders.push(order_object);
    }

    Base.findOne({ name: request.body.name })
        .then((asset) => {
            // Compulsorily for buy orders !
            if (request.body.type === "buy") {

                // Check availability status
                // formula = x = price entered/price of one quantity
                // calculatedQuantity = Number(request.body.price) / Number(asset.base_price);
                calculatedQuantity = calculateQuantity(Number(request.body.price),Number(asset.base_price));
                order_object.quantity = calculatedQuantity;  // Quantity for buy order !
                console.log("Price Entered: ",request.body.price);
                console.log("Calculated Quantity: ",calculatedQuantity);

                if (calculatedQuantity <= asset.base_quantity) {
                    buyFlag = true;
                }
            }else if(request.body.type === "sell"){
                let calculate_sell_price = calculatePrice(Number(asset.base_price),Number(request.body.quantity));
                order_object.price = calculate_sell_price; //Price calculated via algo for sell order !
            }

            // Place an order !
            Orderbook.findOne({ name: request.body.name })
                .then((asset_order) => {
                    if (asset_order) {
                        if (request.body.type === "sell") {
                            // Sell Order Update Query
                            Orderbook.updateOne({
                                name: request.body.name
                            }, {
                                $push: { sellOrders: { type: order_object.type, quantity : order_object.quantity,price : order_object.price } }
                            }, {
                                $new: true
                            })
                                .then(() => {
                                    console.log("Order Placed !");
                                    Orderbook.findOne({name: request.body.name})
                                    .then((orders)=>{
                                        console.log(orders);
                                        // For sell Orders !
                                        orders.sellOrders.forEach(element => {
                                            all_orders.push(element); //Pushing all sell orders in all_orders array !
                                        });

                                        // For buy orders !
                                        orders.buyOrders.forEach(element => {
                                            all_orders.push(element); //Pushing all buy orders in all_orders array !
                                        });

                                        // For admin order !
                                        let admin_order_object = {};
                                        admin_order_object.type = "sell";
                                        admin_order_object.price = asset.base_price;
                                        admin_order_object.quantity = asset.base_quantity;

                                        all_orders.push(admin_order_object);

                                        console.log(all_orders);
                                        let result = trade(all_orders,request.body.name);
                                        console.log("RESULT:    ");
                                        console.log(result);

                                        response.json({
                                            message: "placed"
                                        })


                                    })
                                    .catch(err=>console.log(err));

                                    
                                    // response.json({
                                    //     message: "placed"
                                    // })
                                })
                                .catch((err)=>{console.log("Error: ", err);});
                        } else {
                            if (buyFlag) {
                                // Buy Order Update Query
                                Orderbook.updateOne({
                                    name: request.body.name
                                }, {
                                    $push: { buyOrders: { type: order_object.type, quantity : order_object.quantity,price : order_object.price } }
                                }, {
                                    $new: true
                                })
                                    .then(() => {
                                        console.log("Order Placed !");
                                        
                                        // Start trade as it is a buy order !
                                        Orderbook.findOne({name: request.body.name})
                                            .then((orders)=>{
                                                console.log(orders);
                                                // For sell Orders !
                                                orders.sellOrders.forEach(element => {
                                                    all_orders.push(element); //Pushing all sell orders in all_orders array !
                                                });

                                                // For buy orders !
                                                orders.buyOrders.forEach(element => {
                                                    all_orders.push(element); //Pushing all buy orders in all_orders array !
                                                });

                                                // For admin order !
                                                let admin_order_object = {};
                                                admin_order_object.type = "sell";
                                                admin_order_object.price = asset.base_price;
                                                admin_order_object.quantity = asset.base_quantity;

                                                all_orders.push(admin_order_object);

                                                console.log(all_orders);
                                                let result = trade(all_orders,request.body.name);
                                                console.log("RESULT:    ");
                                                console.log(result);

                                                response.json({
                                                    message: "placed"
                                                })


                                            })
                                            .catch(err=>console.log(err));
                                   
                                    })
                                    .catch(err => console.log("Error: ", err));
                            } else {
                                response.json({
                                    message: "Quantity Error"
                                })
                            }

                        }
                    } else {
                        console.log("Document: ");
                        console.log(order_document_object);

                        if (buyFlag) {
                            new Orderbook(order_document_object).save()
                                .then((order) => {
                                    console.log("Order placed successfully !");

                                    // For first order !
                                     let first_order_object = {};
                                     first_order_object.type = "buy";
                                     first_order_object.price = Number(request.body.price);
                                     first_order_object.quantity = Number(calculatedQuantity);

                                     all_orders.push(first_order_object);

                                     // For admin order !
                                     let admin_order_object = {};
                                     admin_order_object.type = "sell";
                                     admin_order_object.price = asset.base_price;
                                     admin_order_object.quantity = asset.base_quantity;

                                     all_orders.push(admin_order_object);

                                     console.log(all_orders);
                                     let result = trade(all_orders,request.body.name);
                                     console.log("RESULT:    ");
                                     console.log(result);
                                    

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
