import { DataTypes } from 'sequelize';

export default (sequelize) => {
  const QualityTest = sequelize.define('QualityTest', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    oil_batchId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'oil_batches',
        key: 'id'
      }
    },
    acidity_level: {
      type: DataTypes.DECIMAL(5, 3),
      allowNull: true
    },
    grade: {
      type: DataTypes.ENUM('extra_virgin', 'virgin', 'ordinary'),
      allowNull: false
    },
    test_date: {
      type: DataTypes.DATEONLY,
      allowNull: false,
      defaultValue: DataTypes.NOW
    },
    tested_by_employeeId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'employees',
        key: 'id'
      }
    }
  }, {
    tableName: 'quality_tests',
    timestamps: true
  });

  QualityTest.associate = (models) => {
    QualityTest.belongsTo(models.OilBatch, { foreignKey: 'oil_batchId', as: 'oilBatch' });
    QualityTest.belongsTo(models.Employee, { foreignKey: 'tested_by_employeeId', as: 'testedBy' });
  };

  return QualityTest;
};
