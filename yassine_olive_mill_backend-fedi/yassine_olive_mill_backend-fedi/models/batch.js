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
    },

    operation_type: {
      type: DataTypes.ENUM('milling', 'sale'),
      allowNull: true,
      defaultValue: 'milling'
    },

    pressing_room_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'pressing_rooms',
        key: 'id'
      }
    },
    session_start_time: {
      type: DataTypes.DATE,
      allowNull: true
    },
    estimated_time: {
      type: DataTypes.INTEGER,
      allowNull: true,
      defaultValue: 60,
      comment: 'Estimated processing time in minutes'
    },
    ticket_number: {
      type: DataTypes.STRING,
      allowNull: true
    },
    number_of_bidons: {
      type: DataTypes.INTEGER,
      allowNull: true,
      defaultValue: 0

    }
  }, {
    tableName: 'batches',
    timestamps: true
  });

  Batch.associate = (models) => {
    Batch.belongsTo(models.Client, { foreignKey: 'clientId', as: 'client' });
    Batch.belongsTo(models.Price, { foreignKey: 'priceId', as: 'price' });
    Batch.belongsTo(models.PressingRoom, { foreignKey: 'pressing_room_id', as: 'pressingRoom' });
    Batch.hasMany(models.OilBatch, { foreignKey: 'batchId', as: 'oilBatches' });
    Batch.hasMany(models.Invoice, { foreignKey: 'batchId', as: 'invoices' });
  };

  return Batch;
};
