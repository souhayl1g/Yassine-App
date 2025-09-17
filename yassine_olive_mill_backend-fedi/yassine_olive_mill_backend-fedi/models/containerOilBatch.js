import { DataTypes } from 'sequelize';

export default (sequelize) => {
  const ContainerOilBatch = sequelize.define('ContainerOilBatch', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    containerContentId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'container_contents',
        key: 'id'
      }
    },
    oilBatchId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'oil_batches',
        key: 'id'
      }
    },
    weight: {
      type: DataTypes.INTEGER,
      allowNull: false
    }
  }, {
    tableName: 'container_oil_batches',
    timestamps: true
  });

  ContainerOilBatch.associate = (models) => {
    ContainerOilBatch.belongsTo(models.ContainerContent, { foreignKey: 'containerContentId', as: 'containerContent' });
    ContainerOilBatch.belongsTo(models.OilBatch, { foreignKey: 'oilBatchId', as: 'oilBatch' });
  };

  return ContainerOilBatch;
};
