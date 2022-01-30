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
})

// Listening to port and host (Basically kicks on the server)
app.listen(port,host,()=>{
    console.log("Server is running....");
})