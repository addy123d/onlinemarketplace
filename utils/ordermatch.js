let LimitOrder = require('limit-order-book').LimitOrder;
let LimitOrderBook = require('limit-order-book').LimitOrderBook;

function createOrderBook_result(order_name,askPrice,askQuantity,bidPrice,bidQuantity){
    let orderAsk = new LimitOrder(order_name,"ask",askPrice,askQuantity);
    let orderBid = new LimitOrder(order_name,"bid",bidPrice,bidQuantity);

    let book = new LimitOrderBook();

    let result = book.add(orderAsk)
        result = book.add(orderBid)

    console.log(book);
    console.log(book.bidLimits.queue);
    console.log(result);

    return book.bidLimits.queue;
}


// let order1 = new LimitOrder("puma shoe", "ask", 120, 10)
// let order2 = new LimitOrder("puma shoe", "bid",121,5)

// let book = new LimitOrderBook()

// let result = book.add(order1)
//     result = book.add(order2)

// console.log(book)
// console.log(book.bidLimits.queue)
// console.log(result)

module.exports = createOrderBook_result;