const mongo = require("mongoose");
const schema = mongo.Schema;

const productSchema = new schema({
    seller_name : {
        type : String,
        required: true
    },
    email : {
        type : String,
        required : true
    },
    productName : {
        type : String,
        required: true
    },
    productPrice : {
        type : Number,
        required: true
    },
    productQuantity : {
        type : Number,
        required: true
    }
})

module.exports = Product = mongo.model("Products",productSchema);