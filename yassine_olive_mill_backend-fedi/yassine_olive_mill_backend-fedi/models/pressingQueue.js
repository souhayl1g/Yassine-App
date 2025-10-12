import { DataTypes } from 'sequelize';

export default (sequelize) => {
  const PressingQueue = sequelize.define('PressingQueue', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    batch_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'batches',
        key: 'id'
      }
    },
    number_of_boxes: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    operator_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id'
      }
    },
    priority: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },
    status: {
      type: DataTypes.ENUM('queued', 'processing', 'completed'),
      defaultValue: 'queued'
    },
    notes: {
      type: DataTypes.TEXT,
      allowNull: true
    }
  }, {
    tableName: 'pressing_queue',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at'
  });

  PressingQueue.associate = (models) => {
    PressingQueue.belongsTo(models.Batch, { 
      foreignKey: 'batch_id', 
      as: 'batch' 
    });
    PressingQueue.belongsTo(models.User, { 
      foreignKey: 'operator_id', 
      as: 'operator' 
    });
  };

  return PressingQueue;
};
