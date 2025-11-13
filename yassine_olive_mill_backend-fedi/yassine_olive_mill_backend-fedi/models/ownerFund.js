import { DataTypes } from 'sequelize';

export default (sequelize) => {
  const OwnerFund = sequelize.define('OwnerFund', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    date: {
      type: DataTypes.DATEONLY,
      allowNull: false,
      unique: true,
      comment: 'Date of the fund session (one per day)'
    },
    startingFunds: {
      type: DataTypes.DECIMAL(10, 3),
      allowNull: false,
      defaultValue: 0
    },
    amountSpent: {
      type: DataTypes.DECIMAL(10, 3),
      allowNull: false,
      defaultValue: 0
    },
    balance: {
      type: DataTypes.DECIMAL(10, 3),
      allowNull: false,
      defaultValue: 0
    },
    notes: {
      type: DataTypes.TEXT,
      allowNull: true
    }
  }, {
    tableName: 'owner_funds',
    timestamps: true,
    indexes: [
      {
        fields: ['date'],
        unique: true
      }
    ]
  });

  OwnerFund.associate = (models) => {
    OwnerFund.hasMany(models.OwnerFundContainer, { foreignKey: 'ownerFundId', as: 'containers' });
  };

  return OwnerFund;
};

