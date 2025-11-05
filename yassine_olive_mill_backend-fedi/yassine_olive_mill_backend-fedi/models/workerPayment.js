import { DataTypes } from 'sequelize';

export default (sequelize) => {
  const WorkerPayment = sequelize.define('WorkerPayment', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    workerId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'workers',
        key: 'id'
      }
    },
    date: {
      type: DataTypes.DATEONLY,
      allowNull: false
    },
    amount: {
      type: DataTypes.DECIMAL(10, 3),
      allowNull: false
    },
    type: {
      type: DataTypes.ENUM('advance', 'salary', 'other'),
      allowNull: false,
      defaultValue: 'advance'
    },
    method: {
      type: DataTypes.ENUM('cash', 'transfer', 'check'),
      allowNull: false,
      defaultValue: 'cash'
    },
    notes: {
      type: DataTypes.TEXT,
      allowNull: true
    }
  }, {
    tableName: 'worker_payments',
    timestamps: true,
    indexes: [
      {
        fields: ['workerId']
      },
      {
        fields: ['date']
      },
      {
        fields: ['type']
      }
    ]
  });

  WorkerPayment.associate = (models) => {
    WorkerPayment.belongsTo(models.Worker, { foreignKey: 'workerId', as: 'worker' });
  };

  return WorkerPayment;
};

