import { DataTypes } from 'sequelize';

export default (sequelize) => {
  const Invoice = sequelize.define('Invoice', {
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
    batchId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'batches',
        key: 'id'
      }
    },
    processing_decisionId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'processing_decisions',
        key: 'id'
      }
    },
    amount: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    status: {
      type: DataTypes.ENUM('draft', 'sent', 'paid', 'overdue'),
      allowNull: false,
      defaultValue: 'draft'
    },
    issue_date: {
      type: DataTypes.DATEONLY,
      allowNull: false
    },
    due_date: {
      type: DataTypes.DATEONLY,
      allowNull: false
    },
    notes: {
      type: DataTypes.TEXT,
      allowNull: true
    }
  }, {
    tableName: 'invoices',
    timestamps: true
  });

  Invoice.associate = (models) => {
    Invoice.belongsTo(models.Client, { foreignKey: 'clientId', as: 'client' });
    Invoice.belongsTo(models.Batch, { foreignKey: 'batchId', as: 'batch' });
    Invoice.belongsTo(models.ProcessingDecision, { foreignKey: 'processing_decisionId', as: 'processingDecision' });
    Invoice.hasMany(models.Payment, { foreignKey: 'invoiceId', as: 'payments' });
  };

  return Invoice;
};
