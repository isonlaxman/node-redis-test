"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
function toPromise(func) {
    return (...args) => {
        return new Promise((resolve, reject) => {
            args.push(function (err, ...result) {
                if (err) {
                    reject(err);
                }
                else {
                    resolve(result);
                }
            });
            func(...args);
        });
    };
}
exports.toPromise = toPromise;
