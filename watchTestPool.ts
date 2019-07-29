import RedisPool from "./RedisPool";
import { RedisPoolMember } from "./RedisPoolMember";

async function recur(member: RedisPoolMember, key: string) {
  let start = Date.now();
  for (let i = 0; i < 10; i++) {
    await new Promise(resolve => {
      setTimeout(resolve, Math.floor(Math.random() * 5));
    });
    // console.log(RedisPool.getSetSizes());
    await member.watch(key);
    let multi = member.getMulti();
    multi.incr(key);
    await member.exec(multi);
  }

  let val = await member.get(key);
  member.releaseConnection();
  console.log(
    Date.now() - start,
    val, 
    RedisPool.getSetSizes()
  );
}

async function task(num: number) {
  try {
    await RedisPool.init();
  } catch (err) {
    console.log("init error", err);
    return;
  }

  let client: RedisPoolMember;
  // Flush all
  try {
    client = await RedisPool.getClient();
  } catch (err) {
    console.log("CAN'T FLUSH", err, "\n\n\\n");
  }

  let keys = await client.keys("*");
  for (let key of keys) {
    let val = await client.get(key);
    if (val !== "10") {
      console.log("INVALID VAL");
      // return;
    }
  }

  await client.exec(client.getMulti().flushall());
  await client.releaseConnection();

  for (let i = 0; i < num; i++) {
    try {
      let member = await RedisPool.getClient();
      recur(member, String(i));
      // await new Promise(resolve => {
      //   setTimeout(resolve, 50);
      // });
    } catch (e) {
      console.log("error in for loop", e);
    }
  }
}

task(10);
// setTimeout(() => {
//   r();
//   console.log("-------------------------------------------------------------");
// }, 10000);
// setTimeout(() => {
//   r();
//   console.log("-------------------------------------------------------------");
// }, 20000);
