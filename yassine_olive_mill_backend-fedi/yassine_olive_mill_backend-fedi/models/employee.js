import { DataTypes } from 'sequelize';

export default (sequelize) => {
  const Employee = sequelize.define('Employee', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    firstname: {
      type: DataTypes.STRING,
      allowNull: false
    },
    lastname: {
      type: DataTypes.STRING,
      allowNull: false
    },
    role: {
      type: DataTypes.ENUM('operator', 'manager', 'quality_tester', 'admin'),
      allowNull: false
    },
    hire_date: {
      type: DataTypes.DATEONLY,
      allowNull: false
    },
    phone: {
      type: DataTypes.STRING,
      allowNull: true
    },
    active: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true
    }
  }, {
    tableName: 'employees',
    timestamps: true
  });

  Employee.associate = (models) => {
    Employee.hasMany(models.QualityTest, { foreignKey: 'tested_by_employeeId', as: 'qualityTests' });
  };

  return Employee;
};
