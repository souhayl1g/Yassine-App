import { DataTypes } from 'sequelize';

export default (sequelize) => {
  const QueuerSession = sequelize.define('QueuerSession', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    queueId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id'
      },
      comment: 'ID of the queuer user'
    },
    currentBatchId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'batches',
        key: 'id'
      },
      comment: 'Current batch being processed by this queuer'
    },
    totalBoxes: {
      type: DataTypes.INTEGER,
      allowNull: false,
      comment: 'Total boxes in the batch when session started'
    },
    boxesQueued: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      comment: 'Number of boxes already queued from this batch'
    },
    startedAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
      comment: 'When this queuer session started'
    },
    completedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: 'When this queuer session was completed (all boxes queued)'
    },
    status: {
      type: DataTypes.ENUM('active', 'completed', 'cancelled'),
      allowNull: false,
      defaultValue: 'active',
      comment: 'Status of the queuer session'
    }
  }, {
    tableName: 'queuer_sessions',
    timestamps: true,
    indexes: [
      {
        unique: true,
        fields: ['queueId'],
        where: {
          status: 'active'
        },
        name: 'unique_active_queuer_session'
      },
      {
        fields: ['currentBatchId']
      },
      {
        fields: ['status']
      }
    ]
  });

  // Associations
  QueuerSession.associate = (models) => {
    QueuerSession.belongsTo(models.User, { foreignKey: 'queueId', as: 'queuer' });
    QueuerSession.belongsTo(models.Batch, { foreignKey: 'currentBatchId', as: 'batch' });
  };

  return QueuerSession;
};
