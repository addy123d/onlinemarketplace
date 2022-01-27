const express = require("express");
const port = process.env.PORT || 5500;
const host = "127.0.0.1";

// Include Order Matching Algorithm 
const createOrderBook_result = require("./utils/ordermatch");

// Initialising express app
let app = express();

app.use(express.json());
app.use(express.urlencoded({extended: false}));


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
app.use("/",express.static(__dirname + "/client"));

// type - POST
// route - /process
app.post("/process",(request,response)=>{
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
        // Bid against seller's product !
        // createOrderBook_result(order_name,askPrice,askQuantity,bidPrice,bidQuantity)
        // let bidQueue = createOrderBook_result(productName,Number(askData[productIndex].price),Number(askData[productIndex].quantity),Number(bidPrice),Number(bidQuantity));

        //Check whether partial data is empty or not !
        // if(partialData.length === 0){
        //     // createOrderBook_result(order_name,askPrice,askQuantity,bidPrice,bidQuantity,partialPrice,partialQuantity)
        //     let orderValues = createOrderBook_result();
        // }else{

        // }

        // if(bidQueue.length != 0){
        //     response.status(200).json({
        //         "message" : "Order Not Matched"
        //     });
        // }else{
        //     response.status(200).json({
        //         "message" : "Congratulations, Order Matched"
        //     });
        // }

        // First Case : 2 orders, perfectly matched !
        // Second Case : 2 orders, partial matched!
        // createOrderBook_result(order_name,askPrice,askQuantity,bidPrice,bidQuantity,partialPrice,partialQuantity)
        let newValuesObj = createOrderBook_result(productName,Number(askData[productIndex].price),Number(askData[productIndex].quantity),Number(bidPrice),Number(bidQuantity),0,0);

        console.log("New Value Object Generated: ");
        console.log(newValuesObj);

        response.send(newValuesObj.order_status);
    }
})

// Listening to port and host (Basically kicks on the server)
app.listen(port,host,()=>{
    console.log("Server is running....");
})