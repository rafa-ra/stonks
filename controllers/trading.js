const express = require("express");
const router = express.Router;
const axios = require("axios");
const sequelize = require("../util/database");

const User = require("../models/user");
const UserStocks = require("../models/user_stocks");
const Transaction = require("../models/transaction");

exports.getBuy = (req, res, next) => {
  res.render("buy", {
    errorMessage: req.flash("error"),
    isAuth: req.session.isAuth,
  });
};

exports.postBuy = (req, res, next) => {
  const userId = req.session.user;
  //Puxar info da request
  const { symbol, shares } = req.body;
  //Fazer a cotação das ações
  (async () => {
    try {
      const response = await axios.get(
        `https://brapi.dev/api/quote/${symbol}?token=baoXtjHkFGNtRUmTQFUELA`
      );

      const stockInfo = await response.data.results[0];

      //Fazer o cálculo total da ordem
      const orderTotal = stockInfo.regularMarketPrice * shares;

      // //Consultar saldo do usuário
      const userInfo = await User.findOne({
        where: { id: userId },
      });
      const userBalance = userInfo.cash;

      //Caso não tiver saldo
      if (userBalance < orderTotal) {
        //Gerar erro quando usuário não tiver saldo suficiente
        req.flash("error", "Insufficient Funds");
        //Redirecionar para /buy
        res.redirect("/buy");
      } else {
        //Caso tiver saldo
        const updatedBalance = userBalance - orderTotal;
        //Atualizar saldo
        await User.update(
          { cash: updatedBalance },
          {
            where: {
              id: userId,
            },
          }
        );
      }

      //Inserir na user_stocks
      await UserStocks.create({
        user_id: userId,
        stock_symbol: stockInfo.symbol.toUpperCase(),
        shares: shares,
        price: stockInfo.regularMarketPrice,
      });

      //Inserir na Transactions
      await Transaction.create({
        user_id: userId,
        stock_symbol: stockInfo.symbol,
        price: stockInfo.regularMarketPrice,
        shares: shares,
        total: orderTotal,
        type: "Purchase",
      });

      res.redirect("/");
    } catch (err) {
      console.log(err);
      if (err.response.status == 404) {
        req.flash("error", "Stock not found");
      } else {
        req.flash("error", "An error occured while quoting the stock");
      }
      res.redirect("/buy", { isAuth: req.session.isAuth });
    }
  })();
};

exports.getSell = (req, res, next) => {
  const userId = req.session.user;

  (async () => {
    try {
      const userStocks = await UserStocks.findAll({
        attributes: ["stock_symbol"],
        where: { user_id: userId },
        group: ["stock_symbol"],
      });

      res.render("sell", {
        userStocks: userStocks,
        isAuth: req.session.isAuth,
        errorMessage: req.flash("error"),
      });
    } catch (err) {
      console.log(err);
      res.redirect("/sell");
    }
  })();
};

exports.postSell = (req, res, next) => {
  const symbol = req.body.symbol;
  let orderShares = parseInt(req.body.shares);
  const userId = req.session.user;

  (async () => {
    try {
      //Puxar info da request
      const response = await axios.get(
        `https://brapi.dev/api/quote/${symbol}?token=baoXtjHkFGNtRUmTQFUELA`
      );

      //Fazer cotação
      const stockInfo = await response.data.results[0];
      const price = stockInfo.regularMarketPrice;
      const orderTotal = price * orderShares;

      //Consultar saldo de ações
      const dbResponse = await sequelize.query(
        "SELECT SUM(shares) AS totalShares FROM USERSTOCKS WHERE user_id = :userId AND stock_symbol = :stock_symbol GROUP BY stock_symbol",
        {
          replacements: { userId: userId, stock_symbol: symbol },
          type: sequelize.QueryTypes.SELECT,
        }
      );
      userStockBalance = parseInt(dbResponse[0].totalShares);

      //Caso não tiver saldo
      if (userStockBalance < orderShares) {
        //Gerar erro para usuário
        req.flash("error", "Insufficient shares to sell");
        //Redirecionar para sell
        res.redirect("/sell");
      } else {
        //Caso tiver saldo
        //update na user_stocks
        //Loop

        const stocks = await UserStocks.findAll({
          where: {
            user_Id: userId,
            stock_symbol: symbol,
          },
        });

        console.log(stocks);

        for (let stock of stocks) {
          const stockId = stock.id;
          const stockQty = stock.shares;
          //  se quantidade da linha < shares
          if (stockQty <= orderShares) {
            // subtrair de shares
            orderShares -= stockQty;
            // deletar linha
            await UserStocks.destroy({
              where: {
                id: stockId,
              },
            });
          } else {
            // subtrair shares da quantidade da linha
            const finalStockOperation = stockQty - orderShares;
            await UserStocks.update(
              { shares: finalStockOperation },
              {
                where: {
                  id: stockId,
                },
              }
            );
            orderShares = 0;
          }
        }

        const userInfo = await User.findOne({
          where: { id: userId },
        });

        //  update no cash Balance do usuário
        const userBalance = userInfo.cash;

        let finalUserBalance = parseFloat(userBalance) + orderTotal;
        await User.update(
          { cash: finalUserBalance },
          {
            where: {
              id: userId,
            },
          }
        );

        //  Inserir na transactions
        await Transaction.create({
          user_id: userId,
          stock_symbol: symbol.toUpperCase(),
          price: price,
          shares: req.body.shares,
          total: orderTotal,
          type: "Sale",
        });

        res.redirect("/");
      }
    } catch (err) {
      console.log(err);
      // if (err.response.status == 404) {
      // } else {
      // }
    }
  })();
};
