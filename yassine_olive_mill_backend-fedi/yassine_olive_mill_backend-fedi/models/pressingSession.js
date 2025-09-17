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
    }
  }, {
    tableName: 'pressing_sessions',
    timestamps: true
  });

  PressingSession.associate = (models) => {
    PressingSession.belongsTo(models.PressingRoom, { foreignKey: 'pressing_roomID', as: 'pressingRoom' });
    PressingSession.hasMany(models.OilBatch, { foreignKey: 'pressing_sessionId', as: 'oilBatches' });
  };

  return PressingSession;
};
