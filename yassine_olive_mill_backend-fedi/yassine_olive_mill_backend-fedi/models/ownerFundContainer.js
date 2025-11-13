import { DataTypes } from 'sequelize';

export default (sequelize) => {
  const OwnerFundContainer = sequelize.define('OwnerFundContainer', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    ownerFundId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'owner_funds',
        key: 'id'
      }
    },
    containerId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'containers',
        key: 'id'
      }
    }
  }, {
    tableName: 'owner_fund_containers',
    timestamps: false,
    indexes: [
      {
        fields: ['ownerFundId']
      },
      {
        fields: ['containerId']
      },
      {
        unique: true,
        fields: ['ownerFundId', 'containerId']
      }
    ]
  });

  OwnerFundContainer.associate = (models) => {
    OwnerFundContainer.belongsTo(models.OwnerFund, { foreignKey: 'ownerFundId', as: 'ownerFund' });
    OwnerFundContainer.belongsTo(models.Container, { foreignKey: 'containerId', as: 'container' });
  };

  return OwnerFundContainer;
};

