const mongo = require("mongoose");
const schema = mongo.Schema;

const sellerSchema = new schema({
    seller_name : {
        type : String,
        required: true
    },
    email :{
        type: String,
        required: true
    },
    // products : {
    //     type : [Object],
    //     required: true
    // }
    products : [{
        productName : {
            type : String,
            required  :true
        },
        productPrice : {
            type : Number,
            required  :true
        },
        productQuantity : {
            type : Number,
            required  :true
        }
    }]
})

module.exports = Seller = mongo.model("Seller",sellerSchema);