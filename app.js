const express = require('express');
const app = express();
const mongoose = require('mongoose');
const UserRouter = require("./routes");
const bodyParser = require("body-parser");
const cors = require("cors");
require("dotenv").config() 



app.use(express.json());
app.use('/' , UserRouter);
app.use(cors());


app.get('/', (req, res) => {
    res.send('✅ Server is alive');
});

app.use((req,res)=>{
    res.status(404).send({url : req.originalUrl + ' not found'});
})









mongoose.connect(
    process.env.DB_URI).then(() => console.log("✅MongoDB Connected"))
    .catch(err => console.error('❌MongoDB failed:', err));









    const server = app.listen(process.env.PORT, () => {
        console.log(`🚀 EXpress success:${process.env.PORT}`);
    });
      