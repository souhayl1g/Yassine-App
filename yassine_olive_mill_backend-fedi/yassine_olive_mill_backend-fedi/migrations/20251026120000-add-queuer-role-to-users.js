'use strict';

/** @type {import('sequelize-cli').Migration} */
export const up = async (queryInterface, Sequelize) => {
    const dialect = queryInterface.sequelize.getDialect();
    
    if (dialect === 'postgres') {
        try {
            await queryInterface.sequelize.query(`
                ALTER TYPE "enum_users_role" ADD VALUE 'queuer';
            `);
        } catch (error) {
            if (!error.message.includes('already exists')) {
                throw error;
            }
            console.log('Enum value "queuer" already exists, skipping...');
        }
    } else {
        await queryInterface.changeColumn('users', 'role', {
            type: Sequelize.ENUM('admin', 'operator', 'scanner', 'employee', 'queuer'),
            allowNull: false,
            defaultValue: 'scanner'
        });
    }
};

export const down = async (queryInterface, Sequelize) => {
    const dialect = queryInterface.sequelize.getDialect();
    
    if (dialect === 'postgres') {
        await queryInterface.sequelize.query(`
            UPDATE users SET role = 'scanner' WHERE role = 'queuer';
            ALTER TYPE "enum_users_role" RENAME TO "enum_users_role_old";
            CREATE TYPE "enum_users_role" AS ENUM('admin', 'operator', 'scanner', 'employee');
            ALTER TABLE users ALTER COLUMN role TYPE "enum_users_role" USING role::text::"enum_users_role";
            DROP TYPE "enum_users_role_old";
        `);
    } else {
        await queryInterface.sequelize.query(`
            UPDATE users SET role = 'scanner' WHERE role = 'queuer';
        `);
        
        await queryInterface.changeColumn('users', 'role', {
            type: Sequelize.ENUM('admin', 'operator', 'scanner', 'employee'),
            allowNull: false,
            defaultValue: 'scanner'
        });
    }
};
