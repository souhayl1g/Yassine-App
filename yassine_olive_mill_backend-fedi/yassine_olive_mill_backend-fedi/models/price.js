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
      allowNull: false,
      unique: true
    },
    milling_price_per_kg: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    oil_client_selling_price_per_kg: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    oil_export_selling_price_per_kg: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    olive_buying_price_per_kg: {
      type: DataTypes.INTEGER,
      allowNull: false
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
