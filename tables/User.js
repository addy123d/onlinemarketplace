const mongo = require("mongoose");
const schema = mongo.Schema;

const userSchema = new schema({
    name : {
        type : String,
        required: true
    },
    email : {
        type : String,
        required: true
    },
    password : {
        type : String,
        required : true
    },
    portfolio : [{
        name : {
            type : String
        },
        price : {
            type : Number
        },
        no_of_shares : {
            type : Number
        }
    }]
})

module.exports = User = mongo.model("myUser",userSchema);