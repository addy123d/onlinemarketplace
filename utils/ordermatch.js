let LimitOrder = require('limit-order-book').LimitOrder;
let LimitOrderBook = require('limit-order-book').LimitOrderBook;

let book = new LimitOrderBook();
let result;

function trade(orders,order_name){
    for(let i = 0; i < orders.length; i++){
        result = book.add(new LimitOrder(order_name, orders[i].type === "sell" ? 'ask' : 'bid', Number(orders[i].price), Number(orders[i].quantity)));
    }

    console.log("Book: ");
    console.log("Bid Orders: ");
    console.log(book.bidLimits.queue);
    console.log("Ask Orders: ");
    console.log(book.askLimits.queue);


    return result;
}

// let order1 = new LimitOrder("order01", "bid", 13.37, 10)
// let order2 = new LimitOrder("order02", "ask", 13.38, 10)
// let order3 = new LimitOrder("order03", "bid", 13.38, 5)
 

 
// let result = book.add(order1)
// result = book.add(order2)
// result = book.add(order3)
 
// console.log(result)

module.exports = trade;