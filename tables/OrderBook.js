const mongo = require("mongoose");
const schema = mongo.Schema;

const orderbookSchema = new schema({
    name : {
        type : String,
        required : true
    },
    sellOrders : {
            type : [Object]
    },
    buyOrders : {
            type : [Object]
    }
})

module.exports = Order = mongo.model("orders",orderbookSchema);