import { Router, type Request, type Response } from "express";
import type { Router as RouterType } from "express";



const AuthRouter :RouterType = Router();


AuthRouter.post('/signup',(req:Request,res:Response)=>{
    const { username,password,email } = req.body;
    
});

AuthRouter.post('/login',(req:Request,res:Response)=>{

})

export default AuthRouter;