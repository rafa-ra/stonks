const express = require("express");
const router = express.Router();
const sequelize = require("../util/database");
const axios = require("axios");

const Transaction = require("../models/transaction");
const UserStocks = require("../models/user_stocks");
const User = require("../models/user");

exports.getTransactions = (req, res, next) => {
  const userId = req.session.user;
  Transaction.findAll({
    where: {
      user_id: userId,
    },
  })
    .then((transactions) => {
      res.render("transactions", {
        transactions: transactions,
        errorMessage: req.flash("error"),
        isAuth: req.session.isAuth,
      });
    })
    .catch((err) => console.log(err));
};

exports.getHomeInfo = (req, res, next) => {
  const userId = req.session.user;
  (async () => {
    try {
      const stockInfo = [];

      const userStocks = await UserStocks.findAll({
        attributes: [
          "stock_symbol",
          [sequelize.fn("SUM", sequelize.col("shares")), "totalShares"],
        ],
        where: {
          user_id: userId,
        },
        group: ["stock_symbol"],
      });

      let totalStockBalance = 0;

      for (let stock of userStocks) {
        const symbol = stock.stock_symbol;
        const totalShares = stock.dataValues.totalShares;

        const response = await axios.get(
          `https://brapi.dev/api/quote/${symbol}?token=baoXtjHkFGNtRUmTQFUELA`
        );

        const price = await response.data.results[0].regularMarketPrice;
        const totalWorth = (price * totalShares).toFixed(2);

        totalStockBalance += totalWorth;

        stockInfo.push({
          symbol: symbol,
          totalShares: stock.dataValues.totalShares,
          currentPrice: price,
          totalWorth: totalWorth,
        });
      }

      const userBalanceResponse = await User.findOne({
        attributes: ["cash"],
        where: {
          id: userId,
        },
      });

      const userCashBalance = parseFloat(userBalanceResponse.cash);

      res.render("", {
        userStocks: stockInfo,
        userCashBalance: userCashBalance.toFixed(2),
        userTotalBalance: (
          userCashBalance + parseFloat(totalStockBalance)
        ).toFixed(2),
        errorMessage: "",
        isAuth: req.session.isAuth,
      });
    } catch (err) {
      console.log(err);
    }
  })();
};

exports.getPresentation = (req, res, next) => {
  res.render("presentation", {
    isAuth: false,
    errorMessage: "",
  });
};
