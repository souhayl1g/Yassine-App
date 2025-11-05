import { DataTypes } from 'sequelize';

export default (sequelize) => {
  const TicketPayment = sequelize.define('TicketPayment', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    ticketId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'batches',
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
      type: DataTypes.ENUM('incoming', 'outgoing'),
      allowNull: false,
      comment: 'incoming: customer pays us (pressing), outgoing: we pay customer (sale)'
    },
    operation_type: {
      type: DataTypes.ENUM('sale', 'pressing'),
      allowNull: false
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
    tableName: 'ticket_payments',
    timestamps: true,
    indexes: [
      {
        fields: ['ticketId']
      },
      {
        fields: ['payment_date']
      },
      {
        fields: ['payment_type']
      },
      {
        fields: ['operation_type']
      }
    ]
  });

  TicketPayment.associate = (models) => {
    TicketPayment.belongsTo(models.Batch, { foreignKey: 'ticketId', as: 'ticket' });
  };

  return TicketPayment;
};
