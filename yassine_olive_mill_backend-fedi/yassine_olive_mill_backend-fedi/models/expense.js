import { DataTypes } from 'sequelize';

export default (sequelize) => {
  const Expense = sequelize.define('Expense', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    category: {
      type: DataTypes.ENUM('utilities', 'maintenance', 'supplies', 'fuel'),
      allowNull: false
    },
    amount: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    date: {
      type: DataTypes.DATEONLY,
      allowNull: false
    },
    description: {
      type: DataTypes.STRING,
      allowNull: true
    },
    receipt_reference: {
      type: DataTypes.STRING,
      allowNull: true
    }
  }, {
    tableName: 'expenses',
    timestamps: true
  });

  return Expense;
};
