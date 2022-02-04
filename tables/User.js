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
    }
})

module.exports = User = mongo.model("myUser",userSchema);