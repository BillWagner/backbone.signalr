/**
 * Backbone SignalR Adapter
 * https://github.com/SrtSolutions/backbone.signalr
 */

(function () {
    // A simple module to replace `Backbone.sync` with *SignalR*-based
    // persistence. Models are sent to a SignalR hub where they are stored and then
    // broadcast back to anyone else who might be listening.

    // Hold reference to Underscore.js and Backbone.js in the closure in order
    // to make things work even if they are removed from the global namespace
    var _ = this._;
    var Backbone = this.Backbone;

    Backbone.SignalR = function (hubName) {
        var self = this;

        self.hubName = hubName;
        self.hub = $.connection[hubName];
        self.collections = [];

        self.syncUpdates = function (collection) {
            self.collections.push(collection);
        };

        self.hub.client.created = function (data) {
            if (!self.collections) return;

            var modelData = JSON.parse(data);

            _(self.collections).each(function (collection) {
                collection.add(modelData);
            });
        };

        self.hub.client.updated = function (data) {
            if (!self.collections) return;

            var modelData = JSON.parse(data);

            _(self.collections).each(function (collection) {
                collection.add(modelData, { merge: true });
            });
        };

        self.hub.client.destroyed = function (data) {
            if (!self.collections) return;

            var modelData = JSON.parse(data);

            _(self.collections).each(function (collection) {
                collection.remove(modelData);
            });
        };

        self.hub.client.resetItems = function (data) {
            if (!self.collections) return;

            var modelData = JSON.parse(data);

            _(self.collections).each(function (collection) {
                collection.reset(modelData);
            });
        };
    };

    _.extend(Backbone.SignalR.prototype, {
        data: function (model) {
            return JSON.stringify(model.toJSON());
        },

        success: function (options) {
            return function (resp) {
                if (options.success) {
                    resp = JSON.parse(resp);
                    options.success(resp);
                }
            };
        },

        failure: function (options) {
            return function (error) {
                if (options.error) {
                    options.error(error);
                }
            };
        },

        callHub: function (action, model, options) {
            var data = model ? this.data(model) : null;
            var result = data ? this.hub.server[action](data) : this.hub.server[action]();
            return result
                .done(this.success(options))
                .fail(this.failure(options));
        },

        create: function (model, options) {
            return this.callHub("create", model, options);
        },

        update: function (model, options) {
            return this.callHub("update", model, options);
        },

        find: function (model, options) {
            return this.callHub("find", model, options);
        },

        findAll: function (options) {
            return this.callHub("findAll", null, options);
        },

        destroy: function (model, options) {
            return this.callHub("destroy", model, options);
        }
    });

    Backbone.SignalR.sync = Backbone.localSync = function (method, model, options, error) {
        var hub = model.signalRHub || model.collection.signalRHub;

        // Backwards compatibility with Backbone <= 0.3.3
        if (typeof options == 'function') {
            options = {
                success: options,
                error: error
            };
        }

        switch (method) {
            case "read": model.id != undefined ? hub.find(model, options) : hub.findAll(options); break;
            case "create": hub.create(model, options); break;
            case "update": hub.update(model, options); break;
            case "delete": hub.destroy(model, options); break;
        }

        return null;
    };

    Backbone.ajaxSync = Backbone.sync;

    Backbone.getSyncMethod = function (model) {
        if (model.signalRHub || (model.collection && model.collection.signalRHub)) {
            return Backbone.localSync;
        }

        return Backbone.ajaxSync;
    };

    Backbone.sync = function (method, model, options, error) {
        return Backbone.getSyncMethod(model).apply(this, [method, model, options, error]);
    };

})();
