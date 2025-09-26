import { DataTypes } from 'sequelize';

export default (sequelize) => {
  const Batch = sequelize.define('Batch', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    clientId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'clients',
        key: 'id'
      }
    },
    priceId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'prices',
        key: 'id'
      }
    },
    date_received: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW
    },
    weight_in: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    weight_out: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    net_weight: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    number_of_boxes: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    status: {
      type: DataTypes.ENUM('received', 'in_process', 'completed'),
      allowNull: false,
      defaultValue: 'received'
    }
  }, {
    tableName: 'batches',
    timestamps: true
  });

  Batch.associate = (models) => {
    Batch.belongsTo(models.Client, { foreignKey: 'clientId', as: 'client' });
    Batch.belongsTo(models.Price, { foreignKey: 'priceId', as: 'price' });
    Batch.hasMany(models.ProcessingDecision, { foreignKey: 'batchId', as: 'processingDecisions' });
    Batch.hasMany(models.OilBatch, { foreignKey: 'batchId', as: 'oilBatches' });
    Batch.hasMany(models.Invoice, { foreignKey: 'batchId', as: 'invoices' });
  };

  return Batch;
};
