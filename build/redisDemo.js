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
// client.discard();
// client.on("connect", function() {
//   console.log("CONNECT");
// });
// client.on("reconnecting", function() {
//   console.log("RECONNECTING");
// });
// client.on("warning", function() {
//   console.log("WARNING");
// });
// client.on("error", function(err) {
//   console.log("Something went wrong " + err);
// });
// -----------------------------------------------
let client1 = redis.createClient(); // this creates a new client
let client2 = redis.createClient();
let member1;
let member2;
let isConnected1 = false;
let isConnected2 = false;
client1.on("ready", function () {
    isConnected1 = true;
    member1 = new RedisPoolMember_1.RedisPoolMember(client1);
    console.log("READY 1");
});
client2.on("ready", function () {
    isConnected2 = true;
    member2 = new RedisPoolMember_1.RedisPoolMember(client2);
    console.log("READY 2");
});
function recur(member, key, count) {
    if (count === 1000) {
        return;
    }
    member.watch(key);
    let timeout = key === "a" ? Math.floor(Math.random() * 10) : 2;
    // console.log("starting timeout");
    setTimeout(() => __awaiter(this, void 0, void 0, function* () {
        if (key == "a") {
            // let multi = member.getMulti();
            // multi.incr(key);
            // await member.exec(multi);
            yield member.incr(key);
            console.log(key, yield member.get(key));
            recur(member, key, count + 1);
        }
        else {
            yield member.incr(key);
            console.log(key, yield member.get(key));
            recur(member, key, count + 1);
        }
    }), timeout);
}
function r() {
    if (isConnected1 && isConnected2) {
        client1.flushall();
        recur(member1, "a", 0);
        recur(member2, "b", 0);
    }
    else {
        setTimeout(() => r(), 100);
    }
}
// client.on("ready", async function() {
//   await member.set("a", "2");
//   console.log(await member.get("a"));
//   let multi = member.getMulti();
//   multi.get("asdd");
//   await member.exec(multi);
//   console.log(await member.get("a"));
// });
// client.on("end", function() {
//   member.setIsConnected(false);
//   console.log("END");
// });
