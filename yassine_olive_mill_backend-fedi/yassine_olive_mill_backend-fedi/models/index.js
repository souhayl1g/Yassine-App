import { fileURLToPath } from "url";
import { dirname, join, basename as pathBasename } from "path";
import fs from "fs/promises";
import { Sequelize } from "sequelize";
import dotenv from "dotenv";
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const basename = pathBasename(__filename);
const env = process.env.NODE_ENV || "development";

// Load JSON config safely
const getConfig = async () => {
    const configPath = join(__dirname, '../config/config.json');
    const configFile = await fs.readFile(configPath, 'utf8');
    return JSON.parse(configFile);
};

const config = (await getConfig())[env];

let sequelize;
if (config.use_env_variable) {
  sequelize = new Sequelize(process.env[config.use_env_variable], config);
} else {
  sequelize = new Sequelize(
    config.database,
    config.username,
    config.password,
    config
  );
}

const db = {};
const files = (await fs.readdir(__dirname)).filter(
  (file) => file !== basename && file.slice(-3) === ".js"
);

for (const file of files) {
  console.log("Loading model:", file);
  try {
    const modelPath = `file://${join(__dirname, file).replace(/\\/g, '/')}`;
    const modelModule = await import(modelPath);
    const modelFn = modelModule.default || modelModule;
    
    // Handle different model function signatures
    let model;
    if (modelFn.length === 2) {
      // Model expects (sequelize, DataTypes)
      model = modelFn(sequelize, Sequelize.DataTypes);
    } else {
      // Model expects just (sequelize)
      model = modelFn(sequelize);
    }
    
    db[model.name] = model;
    console.log(`✓ Loaded model: ${model.name}`);
  } catch (error) {
    console.error(`✗ Error loading model ${file}:`, error.message);
  }
}

// Set up associations
console.log("Setting up associations...");
Object.keys(db).forEach((modelName) => {
  if (db[modelName].associate) {
    try {
      db[modelName].associate(db);
      console.log(`✓ Associated model: ${modelName}`);
    } catch (error) {
      console.error(`✗ Error associating ${modelName}:`, error.message);
    }
  }
});

db.sequelize = sequelize;
db.Sequelize = Sequelize;

export default db;