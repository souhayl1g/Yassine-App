import { DataTypes } from 'sequelize';

export default (sequelize) => {
  const BatchLoading = sequelize.define('BatchLoading', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    batchId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'batches',
        key: 'id'
      }
    },
    pressingSessionId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'pressing_sessions',
        key: 'id'
      }
    },
    pressingRoomId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'pressing_rooms',
        key: 'id'
      }
    },
    operatorId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'users',
        key: 'id'
      }
    },
    boxesLoaded: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    loadedAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW
    },
    notes: {
      type: DataTypes.TEXT,
      allowNull: true
    }
  }, {
    tableName: 'batch_loadings',
    timestamps: true
  });

  // Define associations
  BatchLoading.associate = (models) => {
    BatchLoading.belongsTo(models.Batch, {
      foreignKey: 'batchId',
      as: 'batch'
    });
    
    BatchLoading.belongsTo(models.PressingSession, {
      foreignKey: 'pressingSessionId',
      as: 'pressingSession'
    });
    
    BatchLoading.belongsTo(models.PressingRoom, {
      foreignKey: 'pressingRoomId',
      as: 'pressingRoom'
    });
    
    BatchLoading.belongsTo(models.User, {
      foreignKey: 'operatorId',
      as: 'operator'
    });

    BatchLoading.hasOne(models.PressingQueue, {
      foreignKey: 'batch_loading_id',
      as: 'pressingQueueEntry'
    });
  };

  return BatchLoading;
};
