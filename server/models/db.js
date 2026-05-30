const Datastore = require('nedb-promises');
const path = require('path');

const dbPath = path.join(__dirname, '../../data');

const users = Datastore.create({ filename: path.join(dbPath, 'users.db'), autoload: true });
const rooms = Datastore.create({ filename: path.join(dbPath, 'rooms.db'), autoload: true });
const characters = Datastore.create({ filename: path.join(dbPath, 'characters.db'), autoload: true });
const stories = Datastore.create({ filename: path.join(dbPath, 'stories.db'), autoload: true });
const gameEvents = Datastore.create({ filename: path.join(dbPath, 'gameEvents.db'), autoload: true });

users.ensureIndex({ fieldName: 'username', unique: true });

module.exports = {
  users,
  rooms,
  characters,
  stories,
  gameEvents
};
