const express = require("express");
const axios = require("axios");
const router = express.Router();

exports.getQuote = (req, res, next) => {
  res.render("quote", {
    errorMessage: req.flash("error"),
    isAuth: req.session.isAuth,
  });
};

exports.postQuote = (req, res, next) => {
  (async () => {
    symbol = req.body.symbol;
    try {
      const response = await axios.get(
        `https://brapi.dev/api/quote/${symbol}?token=baoXtjHkFGNtRUmTQFUELA`
      );
      const stockInfo = response.data.results[0];

      await res.render("quoted", {
        name: stockInfo.longName,
        price: stockInfo.regularMarketPrice,
        symbol: stockInfo.symbol,
        isAuth: req.session.isAuth,
        errorMessage: req.flash("error"),
      });
    } catch (err) {
      if (err.response.status == 404) {
        req.flash("error", "Stock not found");
        res.redirect("/quote", {
          isAuth: req.session.isAuth,
        });
      }
    }
  })();
};

exports.getQuoted = (req, res, next) => {
  res.render("quoted", { isAuth: req.session.isAuth });
};
