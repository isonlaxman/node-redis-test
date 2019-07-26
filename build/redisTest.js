"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const redis = require("redis");
class RedisPoolMember {
    constructor(clientConfig) {
        this.connect = () => {
            if (this.client !== undefined) {
            }
        };
        // Event handler for when the client is in ready state
        this.onClientReady = (err, res) => {
            if (err !== null && err !== undefined) {
                throw Error("Error in client ready");
            }
            this.isConnected = true;
        };
        // Event handler for when the client has ended
        this.onClientEnd = (err, res) => {
            if (err !== null && err !== undefined) {
                throw Error("Error in client end");
            }
            this.isConnected = false;
        };
        this.getMulti = () => {
            return this.client.multi();
        };
        this.isConnected = false;
        this.wasTerminated = false;
        this.config = clientConfig;
        this.client = redis.createClient(clientConfig);
        // Set up the event handlers
        // ? Is it ok if I set it up in the constructor? Atleast this is what I found on StackOverflow
        this.client.on("ready", this.onClientReady);
        this.client.on("end", this.onClientEnd);
    }
}
class RedisDriver {
    constructor(poolConfig, clientConfig) {
        this.poolConfig = poolConfig;
        this.clientConfig = clientConfig;
        for (let i = 0; i < poolConfig.minPoolSize; i++) {
            this.members[i] = new RedisPoolMember(clientConfig);
        }
    }
}
RedisDriver.init = (poolConfig, clientConfig) => {
    if (RedisDriver.instance === undefined) {
        try {
            RedisDriver.instance = new RedisDriver(poolConfig, clientConfig);
        }
        catch (err) {
            RedisDriver.instance = undefined;
            throw Error("Error while initint");
        }
    }
};
