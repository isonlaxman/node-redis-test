import * as redis from "redis";

import { RedisPoolMember } from "./RedisPoolMember";

export default class RedisPool {
  private static instance: RedisPool | undefined;
  private idleMemberSet: Set<RedisPoolMember>;
  private busyMemberSet: Set<RedisPoolMember>;
  private clientConfig: redis.ClientOpts;
  private static maxNumberOfClients: undefined | number;
  private static waitingList: ((member: RedisPoolMember) => void)[] = [];

  private constructor(clientConfig: redis.ClientOpts) {
    this.clientConfig = clientConfig;
    this.idleMemberSet = new Set<RedisPoolMember>();
    this.busyMemberSet = new Set<RedisPoolMember>();
  }

  static dontKeepClient(): Promise<RedisPoolMember> {
    let instance = RedisPool.instance;

    return new Promise<RedisPoolMember>((actualResolve, actualReject) => {
      let isFinished = false;
      function resolve(member: RedisPoolMember) {
        if (isFinished) {
          return;
        }
        isFinished = true;
        instance.idleMemberSet.delete(member);
        instance.busyMemberSet.add(member);
        actualResolve(member);
      }

      function reject(err: any) {
        if (isFinished) {
          return;
        }
        isFinished = true;
        actualReject(err);
      }

      RedisPool.waitingList.push(resolve);

      setTimeout(() => {
        reject(new Error("Waited for 500 ms to get a connection. But failed"));
      }, 500);
    });
  }

  static keepClient() {
    let instance = RedisPool.instance;
    return new Promise<RedisPoolMember>((actualResolve, actualReject) => {
      let newClient = redis.createClient(instance.clientConfig);
      let member: RedisPoolMember | undefined;
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

        if (RedisPool.shouldKeepClient(false)) {
          instance.idleMemberSet.add(member);
          if (RedisPool.waitingList.length > 0) {
            let next = RedisPool.waitingList.shift();
            next(member);
          }
        } else {
          member.quit();
        }
      };

      newClient.on("ready", (err, res) => {
        if (endCalled) {
          return;
        }

        if (err !== undefined && err !== null) {
          reject(err);
        } else {
          member = new RedisPoolMember(newClient, releaseMember);
          instance.busyMemberSet.add(member);
          resolve(member);
        }
      });

      newClient.on("error", (err, res) => {
        // end will be called after this.
        lastError = err;
      });

      newClient.on("end", async (err, res) => {
        if (endCalled) {
          return;
        }

        endCalled = true;

        if (member === undefined) {
          newClient.quit();
          let toThrowErr = new Error("Something went wrong");
          if (err !== undefined) {
            toThrowErr = err;
          } else if (lastError !== undefined) {
            toThrowErr = lastError;
          }
          reject(toThrowErr);
        } else {
          member.setIsConnected(false);
          instance.busyMemberSet.delete(member);
          instance.idleMemberSet.delete(member);
          member.quit();
          return;
        }
      });
    });
  }

  static getClient = async (): Promise<RedisPoolMember> => {
    let instance = RedisPool.instance;
    if (instance === undefined) {
      throw new Error("init function not called");
    }

    if (instance.idleMemberSet.size == 0) {
      if (!RedisPool.shouldKeepClient(true)) {
        return RedisPool.dontKeepClient();
      } else {
        return RedisPool.keepClient();
      }
    } else {
      let member: RedisPoolMember | undefined;
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
  };

  static shouldKeepClient = (goesToMax: boolean) => {
    let instance = RedisPool.instance;
    if (instance === undefined) {
      throw new Error("init function not called");
    }

    let currNumberOfClients =
      instance.busyMemberSet.size + instance.idleMemberSet.size;
    let noOtherClient = currNumberOfClients === 0;

    let withinLimitOfMax: boolean;
    let percent = goesToMax ? 0.75 : 0.25;

    withinLimitOfMax =
      RedisPool.maxNumberOfClients !== undefined &&
      Math.floor(percent * RedisPool.maxNumberOfClients) > currNumberOfClients;

    return noOtherClient || withinLimitOfMax;
  };

  static getSetSizes = () => {
    let instance = RedisPool.instance;
    return `${instance.busyMemberSet.size} ${instance.idleMemberSet.size}`;
  };

  static init = async (clientConfig?: redis.ClientOpts | undefined) => {
    if (RedisPool.instance === undefined) {
      RedisPool.instance = new RedisPool(
        clientConfig === undefined ? {} : clientConfig
      );
    }

    let client: RedisPoolMember;
    let maxNumber = undefined;

    try {
      client = await RedisPool.getClient();
      maxNumber = Number(
        (await client.sendCommand("CONFIG", "GET", "maxclients"))[1]
      );
    } catch (err) {
      if (client !== undefined) {
        client.quit();
      }

      RedisPool.instance = undefined;
      throw err;
    }
    client.releaseConnection();
    RedisPool.maxNumberOfClients = maxNumber;
  };
}

type TypePoolConfig = {
  minPoolSize: number;
};
