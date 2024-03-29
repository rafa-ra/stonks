const { DataTypes } = require("sequelize");
const sequelize = require("../util/database");
const User = require("./user");
const UserStocks = require("./user_stocks");

const Transaction = sequelize.define("Transaction", {
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
  price: {
    type: DataTypes.DECIMAL(10, 2),
  },
  shares: {
    type: DataTypes.INTEGER,
  },
  total: {
    type: DataTypes.DECIMAL(10, 2),
  },
  type: {
    type: DataTypes.ENUM("Purchase", "Sale"),
    defaultValue: "Purchase",
  },
  createdAt: {
    type: DataTypes.DATE,
    defaultValue: sequelize.literal("CURRENT_TIMESTAMP"),
    allowNull: false,
  },
  updatedAt: {
    type: DataTypes.DATE,
    defaultValue: sequelize.literal("CURRENT_TIMESTAMP"),
    allowNull: false,
    onUpdate: sequelize.literal("CURRENT_TIMESTAMP"),
  },
});

Transaction.belongsTo(User, { foreignKey: "user_id" });
module.exports = Transaction;
