import { DataTypes } from 'sequelize';

export default (sequelize) => {
  const Container = sequelize.define('Container', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    label: {
      type: DataTypes.STRING,
      allowNull: false
    },
    capacity: {
      type: DataTypes.INTEGER,
      allowNull: false
    }
  }, {
    tableName: 'containers',
    timestamps: true
  });

  Container.associate = (models) => {
    Container.hasMany(models.ContainerContent, { foreignKey: 'containerId', as: 'containerContents' });
  };

  return Container;
};
