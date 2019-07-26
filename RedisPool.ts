import * as redis from "redis";
import * as util from "util";
import { RedisPoolMember } from "./RedisPoolMember";

export default class RedisPool {
  private static instance: RedisPool | undefined;
  private idleMemberSet: Set<RedisPoolMember>;
  private busyMemberSet: Set<RedisPoolMember>;
  private poolConfig: TypePoolConfig;
  private clientConfig: redis.ClientOpts;

  private constructor(
    poolConfig: TypePoolConfig,
    clientConfig: redis.ClientOpts
  ) {
    this.poolConfig = poolConfig;
    this.clientConfig = clientConfig;
    this.idleMemberSet = new Set<RedisPoolMember>();
    this.busyMemberSet = new Set<RedisPoolMember>();
  }

  static getClient = async (
    init: boolean = false
  ): Promise<RedisPoolMember> => {
    let instance = RedisPool.instance;

    if (instance.idleMemberSet.size == 0) {
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
          if (
            instance.busyMemberSet.size + instance.idleMemberSet.size <
            instance.poolConfig.minPoolSize
          ) {
            instance.idleMemberSet.add(member);
          } else {
            member.quit();
          }
        };

        newClient.on("ready", (err, res) => {
          if (endCalled) {
            return;
          }

          if (err !== undefined && err !== null) {
            reject(new Error("Client could not be created"));
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
            let toThrowerr = new Error("Something went wrong");
            if (err !== undefined) {
              toThrowerr = err;
            } else if (lastError !== undefined) {
              toThrowerr = lastError;
            }
            reject(toThrowerr);
          } else {
            member.setIsConnected(false);
            instance.busyMemberSet.delete(member);
            instance.idleMemberSet.delete(member);
            member.quit();
            return;
          }
        });
      });
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

  static getSetSizes = () => {
    let instance = RedisPool.instance;
    return `${instance.busyMemberSet.size} ${instance.idleMemberSet.size}`;
  };

  static init = async (
    poolConfig: TypePoolConfig,
    clientConfig?: redis.ClientOpts | undefined
  ) => {
    if (RedisPool.instance === undefined) {
      RedisPool.instance = new RedisPool(
        poolConfig,
        clientConfig === undefined ? {} : clientConfig
      );

      let members: RedisPoolMember[] = [];
      for (let i = 0; i < poolConfig.minPoolSize; i++) {
        members.push(await RedisPool.getClient());
      }

      for (let i = 0; i < members.length; i++) {
        members[i].releaseMember();
      }
    }
  };
}

type TypePoolConfig = {
  minPoolSize: number;
};
