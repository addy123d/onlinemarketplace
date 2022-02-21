const mongo = require("mongoose");
const schema = mongo.Schema;

const baseSchema = new schema({
    name : {
        type : String,
        required : true
    },
    base_price : {
        type : Number,
        required : true
    },
    availability : {
        type : Boolean,
        required : true
    }
})

module.exports = Base = mongo.model("admin",baseSchema);