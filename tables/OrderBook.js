const mongo = require("mongoose");
const schema = mongo.Schema;

const orderbookSchema = new schema({
    name: {
        type: String,
        required: true
    },
    // sellOrders : {
    //         type : [Object]
    // },
    // buyOrders : {
    //         type : [Object]
    // }
    sellOrders: [{
        id: {
            type: String,
            required: true
        },
        type : {
            type : String
        },
        name: {
            type: String
        },
        email : {
            type : String
        },
        base_price: {
            type: Number
        },
        price: {
            type: Number
        },
        quantity: {
            type: Number
        },
        date: {
            type: String
        }
    }],
    buyOrders: [{
        id: {
            type: String,
            required: true
        },
        type : {
            type : String
        },
        name: {
            type: String
        },
        email : {
            type : String
        },
        base_price: {
            type: Number
        },
        price: {
            type: Number
        },
        quantity: {
            type: Number
        },
        date: {
            type: String
        }
    }]
})

module.exports = Order = mongo.model("orders", orderbookSchema);