export function toPromise<T>(func: (...args: any[]) => any) {
  return (...args: any[]): Promise<T> => {
    return new Promise((resolve, reject) => {
      args.push(function(err: any, ...result: any[]) {
        if (err) {
          reject(err);
        } else {
          resolve(result as any);
        }
      });
      func(...args);
    });
  };
}
