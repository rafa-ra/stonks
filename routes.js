const express = require("express");
const router = express.Router();

const isAuth = require("./util/isAuth");

const transactionsController = require("./controllers/transactions");
const loggingController = require("./controllers/logging");
const tradingControllers = require("./controllers/trading");
const quoteControllers = require("./controllers/quote");

router.get("/signup", loggingController.getSignup);
router.post("/signup", loggingController.postSignup);
router.get("/login", loggingController.getLogin);
router.post("/login", loggingController.postlogin);
router.get("/logout", loggingController.logout);

router.get("/buy", isAuth, tradingControllers.getBuy);
router.post("/buy", isAuth, tradingControllers.postBuy);
router.get("/sell", isAuth, tradingControllers.getSell);
router.post("/sell", isAuth, tradingControllers.postSell);

router.get("/transactions", isAuth, transactionsController.getTransactions);

router.get("/quote", quoteControllers.getQuote);
router.post("/quote", quoteControllers.postQuote);
router.get("/quoted", quoteControllers.getQuoted);

router.get("/presentation", transactionsController.getPresentation);

router.get("/", isAuth, transactionsController.getHomeInfo);

module.exports = router;
