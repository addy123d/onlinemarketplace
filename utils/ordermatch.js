let LimitOrder = require('limit-order-book').LimitOrder;
let LimitOrderBook = require('limit-order-book').LimitOrderBook;

function createOrderBook_result(order_name,askPrice,askQuantity,bidPrice,bidQuantity,partialPrice,partialQuantity){
    let orderAsk = new LimitOrder(order_name,"ask",askPrice,askQuantity);
    let orderpartialBid = new LimitOrder(order_name,"bid",partialPrice, partialQuantity);
    let ordernewBid = new LimitOrder(order_name,"bid",bidPrice,bidQuantity);

    let newAskprice,newAskquantity;
    let newQuantity = {};
    let quantityObj;

if(partialQuantity === 0){
    orderpartialBid = null;
    // Check which type of order !
    // Perfect Order
    if(askPrice <= bidPrice && askQuantity >= bidQuantity){
        // Do trade !
        quantityObj = trade("perfect",orderAsk,orderpartialBid,ordernewBid);
        // Calculations !
        newAskprice = quantityObj.price;
        newAskquantity = quantityObj.size + 2*partialQuantity;

        newQuantity.name = order_name;
        newQuantity.price = newAskprice;
        newQuantity.quantity = newAskquantity;
        newQuantity.order_status = "Order Matched";

        return newQuantity;
    }else if(askPrice <= bidPrice && askQuantity < bidQuantity){ //Partially matched order
        // Do trade !
        quantityObj = trade("partial",orderAsk,orderpartialBid,ordernewBid);
        // Calculations
        newAskprice = quantityObj.price;
        newAskquantity = askQuantity+2*quantityObj.size; 
        // Here we are partial quantity with quantityObj.size because returned value is from, i.e it is a remaining value not total value.

        newQuantity.name = order_name;
        newQuantity.price = newAskprice;
        newQuantity.quantity = newAskquantity;
        newQuantity.partialPrice = quantityObj.price;
        newQuantity.partialQuantity = quantityObj.size;
        newQuantity.order_status = "Order is Partially Completed";

        return newQuantity;
    }else{
        return -1; // For invalid orders !
    }

}else{
    // When order are simultaneous !

    if((bidQuantity > askQuantity) || ((bidQuantity + partialQuantity) > askQuantity)){
        quantityObj = trade("mixed_partial",orderAsk,orderpartialBid,ordernewBid);

        console.log("First Check for partial Mixed");
        console.log(quantityObj);

          // Calculations
          newAskprice = quantityObj.price;
          newAskquantity = askQuantity+2*quantityObj.size; 
          // Here we are partial quantity with quantityObj.size because returned value is from, i.e it is a remaining value not total value.
  
          newQuantity.name = order_name;
          newQuantity.price = newAskprice;
          newQuantity.quantity = newAskquantity;
          newQuantity.partialPrice = quantityObj.price;
          newQuantity.partialQuantity = quantityObj.size;
          newQuantity.order_status = "Order is Partially Completed";
  
          return newQuantity;

    }else if(bidQuantity <= askQuantity){
        quantityObj = trade("mixed_match",orderAsk,orderpartialBid,ordernewBid);

        console.log("Quantity Object: ");
        console.log(quantityObj);
        console.log(partialQuantity);

          // Calculations !
          newAskprice = quantityObj.price;
          newAskquantity = quantityObj.size + 2*partialQuantity;
  
          newQuantity.name = order_name;
          newQuantity.price = newAskprice;
          newQuantity.quantity = newAskquantity;
          newQuantity.order_status = "Order Matched";
  
          return newQuantity;

    }
    else{
        return -1;
    }
}

}

function trade(order_type,orderAsk,orderpartialBid,ordernewBid){
    let book = new LimitOrderBook();

    let result = book.add(orderAsk)
        if(orderpartialBid != null) result = book.add(orderpartialBid) //In case of first trade for any product
        result = book.add(ordernewBid)

    
    console.log(book);
    console.log(book.bidLimits.queue);
    console.log(result);

    let quantityObj = {};

    if(order_type === "perfect"){
        quantityObj.price = result.taker.price;
        quantityObj.size = result.makers[0].size;

        console.log("Quantity Object: ");
        console.log(quantityObj);

        return quantityObj;
    }else if(order_type === "partial"){
        console.log("IT IS A PARTIAL ORDER !");
        console.log(book.bidLimits.queue);

        quantityObj.price = book.bidLimits.queue[0].price;
        quantityObj.size = book.bidLimits.queue[0].volume;

        return quantityObj;

    }else{
        // Check whether order will be partial or perfectly matched !
        if(order_type === "mixed_partial"){ //Order is partial !
            console.log("Second Check for partial mixed !");
            console.log(book.bidLimits.queue);

            quantityObj.price = book.bidLimits.queue[0].price;
            quantityObj.size = book.bidLimits.queue[0].volume;
    
            return quantityObj;
    
        }else{ // Order is perfectly matched 
            console.log("Check for Mixed Matched!");
            quantityObj.price = result.taker.price;
            quantityObj.size = result.taker.size;
    
            return quantityObj;
        }
    }



    // return book.bidLimits.queue;
}


// let order1 = new LimitOrder("order", "ask", 124, 18);
// let order2 = new LimitOrder("order", "bid", 124, 2); 
// let order3 = new LimitOrder("order", "bid", 125, 17);

// //Step1 ask - price - 500, quantity - askquantity + 2*partialquantity , partialprice - 500, partialquantity - 3
// // Step 2

// // update in the ask price and quantity
// // update in the partial data !
// // ask price = 1401, ask quantity = 101+1
// // partial price = 1401, partial quantity = 1
// // When order is invalid, then value of takesize and takevalue is zero !

// let book = new LimitOrderBook();

// let result = book.add(order1)
// result = book.add(order2)
// result = book.add(order3)

// console.log(book);
// console.log(book.bidLimits.queue);
// // console.log(book.bidLimits.queue[0].price);
// // console.log(book.bidLimits.queue[0].volume);
// console.log(result);
// console.log(result.taker.price);
// console.log(result.taker.size);

module.exports = createOrderBook_result;



// Case 1
// When order is matched
// Condition - Price : askprice=<bidprice , quantity: askquantity=>bidquantity
// Return - askprice = bidprice, askquantity = askquantity 

// Case 2
// When order is partially matched
// Condition - Price : askprice=<bidprice , quantity : askquantity < bidquantity
// Return - askprice = bidprice, quantity = bidquantity - askquantity


// Case 3
// When order is invalid
// Condition - Price : askprice > bidprice
// Return - 0