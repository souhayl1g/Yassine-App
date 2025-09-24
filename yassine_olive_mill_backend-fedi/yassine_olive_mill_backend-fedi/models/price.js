import { DataTypes } from 'sequelize';

export default (sequelize) => {
  const Price = sequelize.define('Price', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    date: {
      type: DataTypes.DATEONLY,
      allowNull: true
    },
    milling_price_per_kg: {
      type: DataTypes.FLOAT,
      allowNull: true
    },
    oil_client_selling_price_per_kg: {
      type: DataTypes.FLOAT,
      allowNull: true
    },
    oil_export_selling_price_per_kg: {
      type: DataTypes.FLOAT,
      allowNull: true
    },
    olive_buying_price_per_kg: {
      type: DataTypes.FLOAT,
      allowNull: true
    }
  }, {
    tableName: 'prices',
    timestamps: true
  });

  Price.associate = (models) => {
    Price.hasMany(models.ProcessingDecision, { foreignKey: 'priceId', as: 'processingDecisions' });
  };

  return Price;
};
