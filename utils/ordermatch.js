let LimitOrder = require('limit-order-book').LimitOrder
let LimitOrderBook = require('limit-order-book').LimitOrderBook
 
let order1 = new LimitOrder("puma shoe", "bid", 121, 1)
let order2 = new LimitOrder("puma shoe", "ask", 120, 1)
let order3 = new LimitOrder("puma shoe", "bid", 121, 2)
let order4 = new LimitOrder("puma shoe", "bid",130,3)




let book = new LimitOrderBook()

let result = book.add(order1)
result = book.add(order2)
result = book.add(order3)
result = book.add(order4)

console.log(book.bidLimits.queue)

console.log(result)