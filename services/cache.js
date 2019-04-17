const mongoose = require('mongoose');
const redis = require('redis')
const { promisify } = require('util');
const keys = require('../config/keys')

const client = redis.createClient(keys.redisUrl);
client.hget = promisify(client.hget).bind(client);

const exec = mongoose.Query.prototype.exec;
mongoose.Query.prototype.cache = function (options = {}) {
  this.useCache = true;
  console.log('using cache')

  this.hashKey = JSON.stringify(options.key)
  return this
}

mongoose.Query.prototype.exec = async function () {
  if (!this.useCache) {
    console.log('not using cache')
    return exec.apply(this, arguments)
  }
  console.log('using data with:')
  const key = JSON.stringify(Object.assign({}, this.getQuery(), {
    collection: this.mongooseCollection.name
  }))
  let cachedValue = await client.hget(this.hashKey, key);
  if (cachedValue) {
    console.log('cached')
    cachedValue = JSON.parse(cachedValue)
    cachedValue = Array.isArray(cachedValue)
      ? cachedValue.map(c => new this.model(c))
      : new this.model(cachedValue)
    return cachedValue

  }
  console.log('mongoose')
  const result = await exec.apply(this, arguments)

  client.hset(this.hashKey, key, JSON.stringify(result))
  const expireSeconds = 5 * 60 * 60 // 5 hours
  client.expire(this.hashKey, expireSeconds)

  return result
}

module.exports = {
  clearHash(hashKey) {
    client.del(JSON.stringify(hashKey))
  }
}