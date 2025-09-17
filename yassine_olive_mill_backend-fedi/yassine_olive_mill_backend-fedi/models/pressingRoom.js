import { DataTypes } from 'sequelize';

export default (sequelize) => {
  const PressingRoom = sequelize.define('PressingRoom', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false
    },
    capacity: {
      type: DataTypes.INTEGER,
      allowNull: true
    }
  }, {
    tableName: 'pressing_rooms',
    timestamps: true
  });

  PressingRoom.associate = (models) => {
    PressingRoom.hasMany(models.PressingSession, { foreignKey: 'pressing_roomID', as: 'pressingSessions' });
  };

  return PressingRoom;
};
