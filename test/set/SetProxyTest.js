/*
 * Copyright (c) 2008-2021, Hazelcast, Inc. All Rights Reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
'use strict';

const expect = require('chai').expect;
const RC = require('./../RC');
const { Client } = require('../../');
const { ItemEventType } = require('../../lib/proxy/ItemListener');

describe('SetProxyTest', function () {

    let cluster;
    let client;
    let setInstance;

    before(function () {
        return RC.createCluster().then(function (response) {
            cluster = response;
            return RC.startMember(cluster.id);
        }).then(function () {
            return Client.newHazelcastClient({ clusterName: cluster.id });
        }).then(function (hazelcastClient) {
            client = hazelcastClient;
        });
    });

    beforeEach(function () {
        return client.getSet('test').then(function (s) {
            setInstance = s;
        });
    });

    afterEach(function () {
        return setInstance.destroy();
    });

    after(function () {
        return client.shutdown()
            .then(() => RC.terminateCluster(cluster.id));
    });

    it('adds one item', function () {
        return setInstance.add(1).then(function () {
            return setInstance.size().then(function (size) {
                expect(size).to.equal(1);
            });
        });
    });

    it('adds all', function () {
        return setInstance.addAll([1, 2, 3]).then(function () {
            return setInstance.size().then(function (size) {
                expect(size).to.equal(3);
            });
        });
    });

    it('toArray', function () {
        const input = [1, 2, 3];
        return setInstance.addAll(input).then(function () {
            return setInstance.toArray().then(function (all) {
                expect(all.sort()).to.deep.equal(input);
            });
        });
    });

    it('contains', function () {
        const input = [1, 2, 3];
        return setInstance.addAll(input).then(function () {
            return setInstance.contains(1).then(function (contains) {
                expect(contains).to.be.true;
            });
        }).then(function () {
            return setInstance.contains(5).then(function (contains) {
                expect(contains).to.be.false;
            });
        });
    });

    it('contains all', function () {
        return setInstance.addAll([1, 2, 3]).then(function () {
            return setInstance.containsAll([1, 2]).then(function (contains) {
                expect(contains).to.be.true;
            });
        }).then(function () {
            return setInstance.containsAll([3, 4]).then(function (contains) {
                expect(contains).to.be.false;
            });
        });
    });


    it('is empty', function () {
        return setInstance.isEmpty().then(function (empty) {
            expect(empty).to.be.true;
            return setInstance.add(1);
        }).then(function () {
            return setInstance.isEmpty().then(function (empty) {
                expect(empty).to.be.false;
            });
        });
    });

    it('removes an entry', function () {
        return setInstance.addAll([1, 2, 3]).then(function () {
            return setInstance.remove(1)
        }).then(function () {
            return setInstance.toArray().then(function (all) {
                expect(all.sort()).to.deep.equal([2, 3]);
            });
        });
    });

    it('removes multiple entries', function () {
        return setInstance.addAll([1, 2, 3, 4]).then(function () {
            return setInstance.removeAll([1, 2]);
        }).then(function () {
            return setInstance.toArray().then(function (all) {
                expect(all.sort()).to.deep.equal([3, 4]);
            });
        });
    });

    it('retains multiple entries', function () {
        return setInstance.addAll([1, 2, 3, 4]).then(function () {
            return setInstance.retainAll([1, 2]);
        }).then(function () {
            return setInstance.toArray().then(function (all) {
                expect(all.sort()).to.deep.equal([1, 2]);
            });
        });
    });

    it('clear', function () {
        return setInstance.addAll([1, 2, 3, 4]).then(function () {
            return setInstance.clear();
        }).then(function () {
            return setInstance.size();
        }).then(function (s) {
            return expect(s).to.equal(0);
        });
    });

    it('listens for added entry', function (done) {
        setInstance.addItemListener({
            itemAdded: function (itemEvent) {
                expect(itemEvent.name).to.be.equal('test');
                expect(itemEvent.item).to.be.equal(1);
                expect(itemEvent.eventType).to.be.equal(ItemEventType.ADDED);
                expect(itemEvent.member).to.not.be.equal(null);
                done();
            }
        }).then(function () {
            setInstance.add(1);
        }).catch(function (e) {
            done(e);
        });
    });

    it('listens for added and removed entry', function (done) {
        setInstance.addItemListener({
            itemAdded: function (itemEvent) {
                expect(itemEvent.name).to.be.equal('test');
                expect(itemEvent.item).to.be.equal(2);
                expect(itemEvent.eventType).to.be.equal(ItemEventType.ADDED);
                expect(itemEvent.member).to.not.be.equal(null);
            },
            itemRemoved: function (itemEvent) {
                expect(itemEvent.name).to.be.equal('test');
                expect(itemEvent.item).to.be.equal(2);
                expect(itemEvent.eventType).to.be.equal(ItemEventType.REMOVED);
                expect(itemEvent.member).to.not.be.equal(null);
                done();
            },
        }).then(function () {
            return setInstance.add(2);
        }).then(function () {
            return setInstance.remove(2);
        }).catch(function (e) {
            done(e);
        });
    });

    it('listens for removed entry', function (done) {
        setInstance.addItemListener({
            itemRemoved: function (itemEvent) {
                expect(itemEvent.name).to.be.equal('test');
                expect(itemEvent.item).to.be.equal(1);
                expect(itemEvent.eventType).to.be.equal(ItemEventType.REMOVED);
                expect(itemEvent.member).to.not.be.equal(null);
                done();
            }
        }).then(function () {
            return setInstance.add(1);
        }).then(function () {
            return setInstance.remove(1);
        }).catch(function (e) {
            done(e);
        });
    });

    it('remove entry listener', function () {
        return setInstance.addItemListener({
            itemRemoved: function (itemEvent) {
                expect(itemEvent.name).to.be.equal('test');
                expect(itemEvent.item).to.be.equal(1);
                expect(itemEvent.eventType).to.be.equal(ItemEventType.REMOVED);
                expect(itemEvent.member).to.not.be.equal(null);
                done();
            }
        }).then(function (registrationId) {
            return setInstance.removeItemListener(registrationId);
        }).then(function (removed) {
            expect(removed).to.be.true;
        });
    });
});
