'use strict';

const Sequelize = require('sequelize');
const env = process.env.NODE_ENV || 'development';
const config = require(__dirname + '/../config/config.json')[env];
const db = {};

let sequelize;
if (config.use_env_variable) {
  sequelize = new Sequelize(process.env[config.use_env_variable], config);
} else {
  sequelize = new Sequelize(config.database, config.username, config.password, config);
}

db.sequelize = sequelize;
db.Sequelize = Sequelize;

db.User = require('./user')(sequelize, Sequelize);
db.Post = require('./post')(sequelize, Sequelize);
db.Hashtag = require('./hashtag')(sequelize, Sequelize);

db.User.hasMany(db.Post);
db.Post.belongsTo(db.User);

db.Hashtag.belongsToMany(db.Post, { through: 'PostHashtag' });
db.Post.belongsToMany(db.Hashtag, { through: 'PostHashtag', as: 'Hashtags' });

db.User.belongsToMany(db.User, {
  through: 'Follow',
  as: 'Followers',
  foreignKey: 'followingId',
});
db.User.belongsToMany(db.User, {
  through: 'Follow',
  as: 'Followings',
  foreignKey: 'followerId',
});

db.User.belongsToMany(db.Post, { through: 'Like' });
db.Post.belongsToMany(db.User, { through: 'Like', as: 'Likers' });

module.exports = db;
