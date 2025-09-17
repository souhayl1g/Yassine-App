import { DataTypes } from 'sequelize';

export default (sequelize) => {
  const Client = sequelize.define('Client', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    firstname: {
      type: DataTypes.STRING,
      allowNull: false
    },
    lastname: {
      type: DataTypes.STRING,
      allowNull: false
    },
    phone: {
      type: DataTypes.STRING,
      allowNull: false
    },
    address: {
      type: DataTypes.STRING,
      allowNull: true
    }
  }, {
    tableName: 'clients',
    timestamps: true
  });

  Client.associate = (models) => {
    Client.hasMany(models.Batch, { foreignKey: 'clientId', as: 'batches' });
    Client.hasMany(models.Invoice, { foreignKey: 'clientId', as: 'invoices' });
  };

  return Client;
};
