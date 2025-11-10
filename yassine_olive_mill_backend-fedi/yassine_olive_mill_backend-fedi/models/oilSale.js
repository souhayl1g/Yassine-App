import { DataTypes } from 'sequelize';

export default (sequelize) => {
  const OilSale = sequelize.define('OilSale', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    clientId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: 'clients', key: 'id' },
      onDelete: 'CASCADE',
    },
    userId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: { model: 'users', key: 'id' },
      onDelete: 'SET NULL',
    },
    weight_kg: {
      type: DataTypes.FLOAT,
      allowNull: false,
      defaultValue: 0,
    },
    unit_price: {
      type: DataTypes.FLOAT,
      allowNull: false,
      defaultValue: 0,
    },
    total_amount: {
      type: DataTypes.FLOAT,
      allowNull: false,
      defaultValue: 0,
    },
    notes: {
      type: DataTypes.STRING,
      allowNull: true,
    },
  }, {
    tableName: 'oil_sales',
    timestamps: true,
  });

  OilSale.associate = (models) => {
    OilSale.belongsTo(models.Client, { foreignKey: 'clientId', as: 'client' });
    OilSale.belongsTo(models.User, { foreignKey: 'userId', as: 'user' });
  };

  return OilSale;
};
