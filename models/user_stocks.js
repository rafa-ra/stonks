const { DataTypes } = require("sequelize");
const sequelize = require("../util/database");
const User = require("./user");

const UserStocks = sequelize.define("UserStocks", {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  user_id: {
    type: DataTypes.INTEGER,
  },
  stock_symbol: {
    type: DataTypes.STRING(255),
  },
  shares: {
    type: DataTypes.INTEGER,
  },
  price: {
    type: DataTypes.DECIMAL(10, 2),
  },
});

UserStocks.belongsTo(User, { foreignKey: "user_id" });
module.exports = UserStocks;
