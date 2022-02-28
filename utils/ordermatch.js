let LimitOrder = require('limit-order-book').LimitOrder;
let LimitOrderBook = require('limit-order-book').LimitOrderBook;
let result;

let book = new LimitOrderBook();

function trade(orders,order_name){
    for(let i = 0; i < orders.length; i++){
        console.log(order_name,orders[i].type === "sell" ? "ask" : "bid",orders[i].price,orders[i].quantity);
        result = book.add(new LimitOrder(order_name, orders[i].type === "sell" ? "ask" : "bid", Number(orders[i].price), Number(orders[i].quantity)));
    }

    console.log("Book: ");
    console.log(book);

    // BID
    console.log("Bid Orders: ");
    console.log(book.bidLimits.queue[0].queue);

    // ASK
    console.log("Ask Orders: ");
    console.log(book.askLimits.queue[0].queue);


    return result;
}

// let order1 = new LimitOrder("order", "bid", 14.01, 10)
// let order2 = new LimitOrder("order", "ask", 13.38, 10)
 
// let book = new LimitOrderBook();
 
// let result = book.add(order1)
// result = book.add(order2)
// console.log(book);

// // ASK Queue
// console.log("ASK: ");
// // console.log(book.askLimits.queue[0].queue);

// // BID Queue
// console.log("BID: ");
// // console.log(book.bidLimits.queue[0].queue);
 
// console.log(result)

module.exports = trade;