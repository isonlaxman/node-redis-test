"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const redis = require("redis");
let client = redis.createClient();
client.set("a", "1", function (err, res) {
    client.set("b", "2", function (err, res) {
        client.watch("a", function (err, res) {
            client.set("a", "2", function (err, res) {
                let multi = client.multi();
                multi.set("a", "4").exec(function (err, res) {
                    console.log(err, res);
                    client.get("a", function (err, res) {
                        client.get("a", function (err, res) {
                            client.get("a", function (err, res) {
                                client.get("a", function (err, res) {
                                    client.get("a", function (err, res) {
                                        client.get("a", function (err, res) {
                                            client.get("a", function (err, res) {
                                                client.get("a", function (err, res) {
                                                    client.get("a", function (err, res) {
                                                        client.get("a", function (err, res) {
                                                            client.get("a", function (err, res) {
                                                                client.get("a", function (err, res) {
                                                                    client.get("a", function (err, res) {
                                                                        client.get("a", function (err, res) { });
                                                                        client.get("a", function (err, res) { });
                                                                        client.get("a", function (err, res) { });
                                                                    });
                                                                });
                                                            });
                                                        });
                                                    });
                                                });
                                            });
                                        });
                                    });
                                });
                            });
                        });
                    });
                });
            });
        });
    });
});
