import { DataTypes } from 'sequelize';

export default (sequelize) => {
  const ExportPayment = sequelize.define('ExportPayment', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    containerId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'containers',
        key: 'id'
      }
    },
    amount: {
      type: DataTypes.DECIMAL(10, 3),
      allowNull: false
    },
    payment_date: {
      type: DataTypes.DATEONLY,
      allowNull: false
    },
    payment_method: {
      type: DataTypes.STRING,
      allowNull: true,
      defaultValue: 'cash'
    },
    payment_type: {
      type: DataTypes.ENUM('incoming'),
      allowNull: false,
      defaultValue: 'incoming',
      comment: 'always incoming: customer pays us for oil export'
    },
    buyer_name: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: 'Name of the oil buyer'
    },
    buyer_contact: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: 'Contact information of the oil buyer'
    },
    reference: {
      type: DataTypes.STRING,
      allowNull: true
    },
    notes: {
      type: DataTypes.TEXT,
      allowNull: true
    }
  }, {
    tableName: 'export_payments',
    timestamps: true,
    indexes: [
      {
        fields: ['containerId']
      },
      {
        fields: ['payment_date']
      },
      {
        fields: ['buyer_name']
      }
    ]
  });

  ExportPayment.associate = (models) => {
    ExportPayment.belongsTo(models.Container, { foreignKey: 'containerId', as: 'container' });
  };

  return ExportPayment;
};
