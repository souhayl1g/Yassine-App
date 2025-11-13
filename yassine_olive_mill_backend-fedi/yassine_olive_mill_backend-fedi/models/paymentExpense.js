import { DataTypes } from 'sequelize';

export default (sequelize) => {
  const PaymentExpense = sequelize.define('PaymentExpense', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    date: {
      type: DataTypes.DATEONLY,
      allowNull: false
    },
    category: {
      type: DataTypes.ENUM('equipment', 'repair', 'supplies', 'utilities', 'maintenance', 'fuel', 'other'),
      allowNull: false,
      defaultValue: 'other'
    },
    item: {
      type: DataTypes.STRING,
      allowNull: false
    },
    amount: {
      type: DataTypes.DECIMAL(10, 3),
      allowNull: false
    },
    vendor: {
      type: DataTypes.STRING,
      allowNull: true
    },
    notes: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    receipt_reference: {
      type: DataTypes.STRING,
      allowNull: true
    }
  }, {
    tableName: 'payment_expenses',
    timestamps: true,
    indexes: [
      {
        fields: ['date']
      },
      {
        fields: ['category']
      }
    ]
  });

  return PaymentExpense;
};

