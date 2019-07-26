import * as redis from "redis";

let client1 = redis.createClient();
let client2 = redis.createClient();

function recur(client: redis.RedisClient, key: string, count: number) {
  if (count === 1000) {
    return;
  }

  client.watch(key, function(err, res) {
    let timeout = key === "a" ? Math.floor(Math.random() * 10) : 2;
    setTimeout(() => {
      // console.log("watch", key);
      if (key === "a") {
        let multi = client.multi();
        multi.incr(key).exec(function(err, res) {
          console.log(key, err, res);
          recur(client, key, count + 1);
        });
      } else {
        client.incr(key, function(err, res) {
          console.log(key, err, res);
          recur(client, key, count + 1);
        });
      }
    }, timeout);
  });
}

client1.flushall(function(err, res) {
  recur(client1, "a", 0);
  recur(client2, "b", 0);
});

// Scale it up to a to 10 keys and pass each of them diff clients
