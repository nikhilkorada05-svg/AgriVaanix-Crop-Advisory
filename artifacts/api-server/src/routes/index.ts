import { Router, type IRouter } from "express";
import healthRouter from "./health";
import { requireAuth } from "../middlewares/auth";
import farmerRouter from "./farmer";
import farmRouter from "./farm";
import conversationsRouter from "./conversations";
import advisoryRouter from "./advisory";
import preferencesRouter from "./preferences";
import dashboardRouter from "./dashboard";

const router: IRouter = Router();

router.use(healthRouter);
router.use(requireAuth);
router.use(farmerRouter);
router.use(farmRouter);
router.use(conversationsRouter);
router.use(advisoryRouter);
router.use(preferencesRouter);
router.use(dashboardRouter);

export default router;
