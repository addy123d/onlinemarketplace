const express = require("express");
const port = process.env.PORT || 5500;
const host = "127.0.0.1";

const ask = [];

// Initialising express app
let app = express();

app.use(express.json());
app.use(express.urlencoded({extended: false}));

// Routes
// type - GET
// route - /home
// ip:port/home
app.use("/",express.static(__dirname + "/client"));

// type - POST
// route - /process
app.post("/process",(request,response)=>{
    console.log(request.body);

    response.json({
        "message" : "success"
    })
})

// Listening to port and host (Basically kicks on the server)
app.listen(port,host,()=>{
    console.log("Server is running....");
})