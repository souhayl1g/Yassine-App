import { DataTypes } from 'sequelize';

export default (sequelize) => {
  const Worker = sequelize.define('Worker', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    firstName: {
      type: DataTypes.STRING,
      allowNull: false
    },
    lastName: {
      type: DataTypes.STRING,
      allowNull: false
    },
    phone: {
      type: DataTypes.STRING,
      allowNull: true
    },
    status: {
      type: DataTypes.ENUM('active', 'inactive'),
      allowNull: false,
      defaultValue: 'active'
    },
    createdOn: {
      type: DataTypes.DATEONLY,
      allowNull: false,
      defaultValue: DataTypes.NOW
    }
  }, {
    tableName: 'workers',
    timestamps: true,
    indexes: [
      {
        fields: ['status']
      },
      {
        fields: ['createdOn']
      }
    ]
  });

  Worker.associate = (models) => {
    Worker.hasMany(models.WorkerPayment, { foreignKey: 'workerId', as: 'payments' });
  };

  return Worker;
};

