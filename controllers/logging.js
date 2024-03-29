const express = require("express");
const router = express.Router();
const bcrypt = require("bcryptjs");
const User = require("../models/user");

exports.getSignup = (req, res, next) => {
  req.session.destroy();

  res.render("signup", {
    isAuth: false,
    errorMessage: "",
  });
};

exports.postSignup = (req, res, next) => {
  const { username, password, confirmPassword } = req.body;

  (async () => {
    try {
      const user = await User.findOne({
        where: { username: username },
      });

      if (!user) {
        if (password != "" && password == confirmPassword) {
          await User.create({
            username: username,
            hash: await bcrypt.hash(password, 12),
          });

          res.redirect("/");
        } else {
          req.flash("error", "Passwords don't match");
          res.render("signup", {
            errorMessage: req.flash("error"),
            isAuth: req.session.isAuth,
          });
        }
      } else {
        req.flash("error", "User Already Exists");
        res.render("signup", {
          errorMessage: req.flash("error"),
          isAuth: req.session.isAuth,
        });
      }
    } catch (err) {
      console.log(err);
    }
  })();
};

exports.getLogin = (req, res, next) => {
  res.render("login", {
    errorMessage: req.flash("error"),
    isAuth: false,
  });
};

exports.postlogin = (req, res, next) => {
  const { username, password } = req.body;

  (async () => {
    try {
      const user = await User.findOne({
        where: { username: username },
      });

      if (user) {
        if (await bcrypt.compare(password, user.hash)) {
          req.session.isAuth = true;
          req.session.user = user.id;
          res.redirect("/");
        } else {
          req.flash("error", "Invalid Password");
          res.redirect("/login");
        }
      } else {
        req.flash("error", "Invalid User");
        res.redirect("/login");
      }
    } catch (err) {
      console.log(err);
    }
  })();
};

exports.logout = (req, res, next) => {
  req.session.destroy((err) => {
    console.log(err);
    res.redirect("/");
  });
};
