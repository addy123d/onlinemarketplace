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
    products : {
        type : [Object],
        required: true
    }
})

module.exports = Seller = mongo.model("Seller",sellerSchema);