import * as redis from "redis";
import RedisPool from "./RedisPool";
import { RedisPoolMember } from "./RedisPoolMember";

async function recur(member: RedisPoolMember, key: string) {
  let start = Date.now();
  for (let i = 0; i < 1000; i++) {
    try {
      await member.watch(key);
      let multi = member.getMulti();
      multi.incr(key);
      await member.exec(multi);
    } catch (err) {
      console.log("hahaah");
    }
  }

  member.releaseMember();
  console.log(String(Date.now() - start), RedisPool.getSetSizes());
}

async function r(num: number = 100) {
  try {
    await RedisPool.init({ minPoolSize: 1000 });
  } catch (err) {
    console.log("init error");
  }

  for (let i = 0; i < 1000; i++) {
    try {
      let member = await RedisPool.getClient();
      await recur(member, String(i));
      await new Promise(resolve => {
        setTimeout(resolve, 50);
      });
    } catch (e) {
      console.log("hahahahahaahahahahahahahaha", e);
    }
    // console.log(RedisPool.getSetSizes());
  }
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
