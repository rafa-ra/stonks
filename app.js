const http = require("http");
const path = require("path");
const express = require("express");
const sequelize = require("./util/database");
const bodyParser = require("body-parser");
const session = require("express-session");
const flash = require("connect-flash");
const isAuth = require("./util/isAuth");

const routes = require("./routes");
const indexRoute = require("./controllers/transactions");

const app = express();
app.use(bodyParser.urlencoded({ extended: false }));
app.use(session({ secret: "secret", resave: false, saveUninitialized: false }));
app.use(express.static(path.join(__dirname, "public")));
app.use(flash());

const server = http.createServer(app);

app.set("view engine", "ejs");
app.set("views", "views");

app.use(routes);

sequelize
  .sync()
  .then((result) => {
    app.listen(3000);
  })
  .catch((err) => {
    console.log(err);
  });
