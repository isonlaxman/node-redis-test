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
        this.getClient = () => __awaiter(this, void 0, void 0, function* () {
            if (this.idleMemberSet.size == 0) {
                return new Promise((actualResolve, actualReject) => {
                    let newClient = redis.createClient(this.clientConfig);
                    let member;
                    let hasFinished = false;
                    let endCalled = false;
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
                    let releaseMember = () => __awaiter(this, void 0, void 0, function* () {
                        if (member === undefined || endCalled) {
                            return;
                        }
                        this.busyMemberSet.delete(member);
                        if (this.busyMemberSet.size + this.idleMemberSet.size <
                            this.poolConfig.minPoolSize) {
                            this.idleMemberSet.add(member);
                        }
                        else {
                            yield member.quit();
                        }
                    });
                    newClient.on("ready", (err, res) => {
                        if (endCalled) {
                            return;
                        }
                        if (err !== undefined && err !== null) {
                            reject(new Error("Client could not be created"));
                        }
                        else {
                            member = new RedisPoolMember_1.RedisPoolMember(newClient, releaseMember);
                            this.busyMemberSet.add(member);
                            resolve(member);
                        }
                    });
                    newClient.on("end", (err, res) => __awaiter(this, void 0, void 0, function* () {
                        if (endCalled) {
                            return;
                        }
                        endCalled = true;
                        if (member === undefined) {
                            reject(err);
                        }
                        else {
                            member.setIsConnected(false);
                            this.busyMemberSet.delete(member);
                            this.idleMemberSet.delete(member);
                            yield member.quit();
                            return;
                        }
                    }));
                });
            }
            else {
                let member;
                for (let m of this.idleMemberSet) {
                    member = m;
                    break;
                }
                if (member === undefined) {
                    throw Error("Should never come here");
                }
                this.idleMemberSet.delete(member);
                this.busyMemberSet.add(member);
                return member;
            }
        });
        this.poolConfig = poolConfig;
        this.clientConfig = clientConfig;
        this.idleMemberSet = new Set();
        this.busyMemberSet = new Set();
    }
}
RedisPool.init = (poolConfig, clientConfig) => {
    if (RedisPool.instance === undefined) {
        RedisPool.instance = new RedisPool(poolConfig, clientConfig);
    }
};
