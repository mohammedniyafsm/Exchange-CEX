import express from "express"


const app = express();

app.use(express.json());

app.listen('/',()=>{
	console.log("Server Running at 3001");
},3001);

