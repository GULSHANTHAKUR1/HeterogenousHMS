const LocalStorageProvider = require('./localStorageProvider');

let instance = null;

const getStorageProvider = () => {
  if (!instance) {
    instance = new LocalStorageProvider();
  }
  return instance;
};

module.exports = {
  getStorageProvider,
  LocalStorageProvider,
};
