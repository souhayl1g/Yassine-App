import { DataTypes } from 'sequelize';

export default (sequelize) => {
  const PressingSession = sequelize.define('PressingSession', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    start: {
      type: DataTypes.DATE,
      allowNull: false
    },
    finish: {
      type: DataTypes.DATE,
      allowNull: true
    },
    number_of_boxes: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    pressing_roomID: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'pressing_rooms',
        key: 'id'
      }
    },
    batch_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'batches',
        key: 'id'
      }
    },
    status: {
      type: DataTypes.ENUM('waiting', 'done', 'active'),
      allowNull: false,
      defaultValue: 'waiting'
    },
    oil_bidons_produced: {
      type: DataTypes.INTEGER,
      allowNull: true,
      defaultValue: 0
    }
  }, {
    tableName: 'pressing_sessions',
    timestamps: true
  });

  PressingSession.associate = (models) => {
    PressingSession.belongsTo(models.PressingRoom, { foreignKey: 'pressing_roomID', as: 'pressingRoom' });
    PressingSession.belongsTo(models.Batch, { foreignKey: 'batch_id', as: 'batch' });
    PressingSession.hasMany(models.OilBatch, { foreignKey: 'pressing_sessionId', as: 'oilBatches' });
  };

  return PressingSession;
};
