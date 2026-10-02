import { Router } from 'express';
import { AuthController } from './auth.controller.js';
import { validate } from '../../middlewares/validate.middleware.js';
import { loginSchema, refreshTokenSchema } from './auth.schema.js';
import { authenticate } from '../../middlewares/auth.middleware.js';

const router = Router();

const attempts = new Map<string, {count:number; until:number}>();
router.use('/login', (req,res,next)=>{
  const now=Date.now(); for(const [key,item] of attempts) if(item.until<now)attempts.delete(key);
  const key=req.ip||'local'; const item=attempts.get(key)||{count:0,until:now+60000}; item.count++; attempts.set(key,item);
  if(item.count>20){res.status(429).json({success:false,error:{message:'Too many sign-in attempts. Try again in one minute.'}});return;} next();
});
router.post('/login', validate(loginSchema), AuthController.login);
router.post('/refresh', validate(refreshTokenSchema), AuthController.refresh);
router.post('/logout', AuthController.logout);
router.get('/me', authenticate, AuthController.me);

export default router;