import { DataTypes } from 'sequelize';

export default (sequelize) => {
  const ProcessingDecision = sequelize.define('ProcessingDecision', {
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
    type: {
      type: DataTypes.ENUM('milling', 'selling'),
      allowNull: false
    },
    date: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW
    },
    unit_price: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    priceId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'prices',
        key: 'id'
      }
    }
  }, {
    tableName: 'processing_decisions',
    timestamps: true
  });

  ProcessingDecision.associate = (models) => {
    ProcessingDecision.belongsTo(models.Batch, { foreignKey: 'batchId', as: 'batch' });
    ProcessingDecision.belongsTo(models.Price, { foreignKey: 'priceId', as: 'price' });
    ProcessingDecision.hasMany(models.Invoice, { foreignKey: 'processing_decisionId', as: 'invoices' });
  };

  return ProcessingDecision;
};
