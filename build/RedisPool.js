"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const redis = require("redis");
const RedisPoolMember_1 = require("./RedisPoolMember");
class RedisPool {
    constructor(poolConfig, clientConfig) {
        this.poolConfig = poolConfig;
        this.clientConfig = clientConfig;
        this.idleMemberSet = new Set();
        this.busyMemberSet = new Set();
    }
}
RedisPool.getClient = (init = false) => __awaiter(this, void 0, void 0, function* () {
    let instance = RedisPool.instance;
    if (instance.idleMemberSet.size == 0) {
        return new Promise((actualResolve, actualReject) => {
            let newClient = redis.createClient(instance.clientConfig);
            let member;
            let hasFinished = false;
            let endCalled = false;
            let lastError = undefined;
            function resolve(response) {
                if (!hasFinished) {
                    hasFinished = true;
                    actualResolve(response);
                }
            }
            function reject(err) {
                if (!hasFinished) {
                    hasFinished = true;
                    actualReject(err);
                }
            }
            let releaseMember = () => {
                if (member === undefined || endCalled) {
                    return;
                }
                instance.busyMemberSet.delete(member);
                if (instance.busyMemberSet.size + instance.idleMemberSet.size <
                    instance.poolConfig.minPoolSize) {
                    instance.idleMemberSet.add(member);
                }
                else {
                    member.quit();
                }
            };
            newClient.on("ready", (err, res) => {
                if (endCalled) {
                    return;
                }
                if (err !== undefined && err !== null) {
                    reject(new Error("Client could not be created"));
                }
                else {
                    member = new RedisPoolMember_1.RedisPoolMember(newClient, releaseMember);
                    instance.busyMemberSet.add(member);
                    resolve(member);
                }
            });
            newClient.on("error", (err, res) => {
                // end will be called after this.
                lastError = err;
            });
            newClient.on("end", (err, res) => __awaiter(this, void 0, void 0, function* () {
                if (endCalled) {
                    return;
                }
                endCalled = true;
                if (member === undefined) {
                    newClient.quit();
                    let toThrowerr = new Error("Something went wrong");
                    if (err !== undefined) {
                        toThrowerr = err;
                    }
                    else if (lastError !== undefined) {
                        toThrowerr = lastError;
                    }
                    reject(toThrowerr);
                }
                else {
                    member.setIsConnected(false);
                    instance.busyMemberSet.delete(member);
                    instance.idleMemberSet.delete(member);
                    member.quit();
                    return;
                }
            }));
        });
    }
    else {
        let member;
        for (let m of instance.idleMemberSet) {
            member = m;
            break;
        }
        if (member === undefined) {
            throw Error("Should never come here");
        }
        instance.idleMemberSet.delete(member);
        instance.busyMemberSet.add(member);
        return member;
    }
});
RedisPool.getSetSizes = () => {
    let instance = RedisPool.instance;
    return `${instance.busyMemberSet.size} ${instance.idleMemberSet.size}`;
};
RedisPool.init = (poolConfig, clientConfig) => __awaiter(this, void 0, void 0, function* () {
    if (RedisPool.instance === undefined) {
        RedisPool.instance = new RedisPool(poolConfig, clientConfig === undefined ? {} : clientConfig);
        let members = [];
        for (let i = 0; i < poolConfig.minPoolSize; i++) {
            members.push(yield RedisPool.getClient());
        }
        for (let i = 0; i < members.length; i++) {
            members[i].releaseMember();
        }
    }
});
exports.default = RedisPool;
