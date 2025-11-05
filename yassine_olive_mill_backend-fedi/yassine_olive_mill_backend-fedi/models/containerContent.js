import { DataTypes } from 'sequelize';

export default (sequelize) => {
  const ContainerContent = sequelize.define('ContainerContent', {
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
    total_weight: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    recorded_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW
    },
    value: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    currency: {
      type: DataTypes.STRING,
      allowNull: true
    },
    sold: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      comment: 'Flag to indicate if this container content has been sold'
    },
    sold_at: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: 'Timestamp when the container content was sold'
    }
  }, {
    tableName: 'container_contents',
    timestamps: true,
    indexes: [
      {
        fields: ['sold']
      }
    ]
  });

  ContainerContent.associate = (models) => {
    ContainerContent.belongsTo(models.Container, { foreignKey: 'containerId', as: 'container' });
    ContainerContent.hasMany(models.ContainerOilBatch, { foreignKey: 'containerContentId', as: 'containerOilBatches' });
  };

  return ContainerContent;
};
