const Sequelize = require("sequelize");
const sequelize = new Sequelize("stocktrading", "root", "Castlevania31*DB", {
  dialect: "mysql",
  host: "localhost",
});

module.exports = sequelize;
