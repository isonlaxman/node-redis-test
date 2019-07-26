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
const RedisPool_1 = require("./RedisPool");
function recur(member, key) {
    return __awaiter(this, void 0, void 0, function* () {
        let start = Date.now();
        for (let i = 0; i < 1000; i++) {
            try {
                yield member.watch(key);
                let multi = member.getMulti();
                multi.incr(key);
                yield member.exec(multi);
            }
            catch (err) {
                console.log("hahaah");
            }
        }
        member.releaseMember();
        console.log(String(Date.now() - start), RedisPool_1.default.getSetSizes());
    });
}
function r(num = 100) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            yield RedisPool_1.default.init({ minPoolSize: 1000 });
        }
        catch (err) {
            console.log("init error");
        }
        for (let i = 0; i < 1000; i++) {
            try {
                let member = yield RedisPool_1.default.getClient();
                yield recur(member, String(i));
                yield new Promise(resolve => {
                    setTimeout(resolve, 50);
                });
            }
            catch (e) {
                console.log("hahahahahaahahahahahahahaha", e);
            }
            // console.log(RedisPool.getSetSizes());
        }
    });
}
r(10);
// setTimeout(() => {
//   r();
//   console.log("-------------------------------------------------------------");
// }, 10000);
// setTimeout(() => {
//   r();
//   console.log("-------------------------------------------------------------");
// }, 20000);
