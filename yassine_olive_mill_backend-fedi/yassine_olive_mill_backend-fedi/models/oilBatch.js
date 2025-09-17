import { DataTypes } from 'sequelize';

export default (sequelize) => {
  const OilBatch = sequelize.define('OilBatch', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    weight: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    residue: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    batchId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'batches',
        key: 'id'
      }
    },
    pressing_sessionId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'pressing_sessions',
        key: 'id'
      }
    }
  }, {
    tableName: 'oil_batches',
    timestamps: true
  });

  OilBatch.associate = (models) => {
    OilBatch.belongsTo(models.Batch, { foreignKey: 'batchId', as: 'batch' });
    OilBatch.belongsTo(models.PressingSession, { foreignKey: 'pressing_sessionId', as: 'pressingSession' });
    OilBatch.hasMany(models.ContainerOilBatch, { foreignKey: 'oilBatchId', as: 'containerOilBatches' });
    OilBatch.hasMany(models.QualityTest, { foreignKey: 'oil_batchId', as: 'qualityTests' });
  };

  return OilBatch;
};
